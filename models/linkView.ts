import database from "../infra/database";
import shareLink from "./shareLink";
import type {
  LinkView,
  RecordedLinkView,
  LinkViewCreateInput,
  LinkAnalyticsResponse,
  DocumentAnalyticsResponse,
  ViewsByDay,
  TopLink,
  PageBreakdown,
  PageTimeInput,
  LinkViewModel,
} from "../types/index";

interface Queryable {
  query: (query: { text: string; values: unknown[] }) => Promise<unknown>;
}

async function persistPageTimes(
  queryable: Queryable,
  linkViewId: string,
  pageTimes: PageTimeInput[],
): Promise<void> {
  for (const { page, seconds } of pageTimes) {
    await queryable.query({
      text: `
          INSERT INTO
            link_view_pages (link_view_id, page_number, time_on_page_seconds)
          VALUES
            ($1, $2, $3)
          ON CONFLICT
            (link_view_id, page_number)
          DO UPDATE SET
            time_on_page_seconds = link_view_pages.time_on_page_seconds + EXCLUDED.time_on_page_seconds,
            updated_at = NOW()
          ;`,
      values: [linkViewId, page, seconds],
    });
  }
}

const LINK_VIEW_COLUMNS = `
  id, share_link_id, viewer_fingerprint, viewer_email, viewer_name, ip_address,
  country_code, user_agent, time_on_page, pages_viewed, created_at, updated_at
`;

// Repeat views from the same viewer within this window are merged into the
// existing row instead of creating a new one (see recordView).
const DEDUP_WINDOW_MINUTES = 30;

async function recordView(
  token: string,
  input: LinkViewCreateInput,
): Promise<RecordedLinkView> {
  const { id: shareLinkId } = await shareLink.validateToken(token);

  if (!input.viewer_fingerprint) {
    const view = await insertView(shareLinkId, input);
    // No fingerprint means we have no way to tell a new viewer from a
    // returning one, so this never triggers the owner notification.
    return { ...view, is_new_viewer: false };
  }

  return await upsertViewWithDedup(shareLinkId, input);
}

async function insertView(
  shareLinkId: string,
  input: LinkViewCreateInput,
): Promise<LinkView> {
  const results = await database.query<LinkView>({
    text: `
        INSERT INTO
          link_views (
            share_link_id, viewer_fingerprint, viewer_email, viewer_name,
            ip_address, user_agent, time_on_page, pages_viewed
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          ${LINK_VIEW_COLUMNS}
        ;`,
    values: [
      shareLinkId,
      input.viewer_fingerprint ?? null,
      input.viewer_email ?? null,
      input.viewer_name ?? null,
      input.ip_address ?? null,
      input.user_agent ?? null,
      input.time_on_page ?? null,
      input.pages_viewed ?? null,
    ],
  });

  const view = results.rows[0]!;

  if (input.page_times?.length) {
    await persistPageTimes(database, view.id, input.page_times);
  }

  return view;
}

// Uses a dedicated client + transaction (not the shared pool) so the
// SELECT ... FOR UPDATE lock and the following queries happen on the same
// connection, closing the race window between them.
async function upsertViewWithDedup(
  shareLinkId: string,
  input: LinkViewCreateInput,
): Promise<RecordedLinkView> {
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    const existing = await client.query({
      text: `
          SELECT
            id
          FROM
            link_views
          WHERE
            share_link_id = $1
            AND viewer_fingerprint = $2
            AND created_at > NOW() - INTERVAL '${DEDUP_WINDOW_MINUTES} minutes'
          ORDER BY
            created_at DESC
          LIMIT
            1
          FOR UPDATE
          ;`,
      values: [shareLinkId, input.viewer_fingerprint],
    });

    let result;
    let isNewViewer = false;

    if (existing.rowCount) {
      result = await client.query({
        text: `
            UPDATE
              link_views
            SET
              viewer_email = COALESCE($1, viewer_email),
              viewer_name = COALESCE($2, viewer_name),
              time_on_page = COALESCE($3, time_on_page),
              pages_viewed = COALESCE($4, pages_viewed),
              updated_at = NOW()
            WHERE
              id = $5
            RETURNING
              ${LINK_VIEW_COLUMNS}
            ;`,
        values: [
          input.viewer_email ?? null,
          input.viewer_name ?? null,
          input.time_on_page ?? null,
          input.pages_viewed ?? null,
          existing.rows[0].id,
        ],
      });
    } else {
      // Distinct from the dedup check above, which only looks at the last
      // 30 minutes: this looks across all time, so a viewer returning
      // after the dedup window still isn't counted as "new" for the
      // owner-notification feature.
      const priorAnyTime = await client.query({
        text: `
            SELECT
              1
            FROM
              link_views
            WHERE
              share_link_id = $1
              AND viewer_fingerprint = $2
            LIMIT
              1
            ;`,
        values: [shareLinkId, input.viewer_fingerprint],
      });

      isNewViewer = priorAnyTime.rowCount === 0;

      result = await client.query({
        text: `
            INSERT INTO
              link_views (
                share_link_id, viewer_fingerprint, viewer_email, viewer_name,
                ip_address, user_agent, time_on_page, pages_viewed
              )
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
              ${LINK_VIEW_COLUMNS}
            ;`,
        values: [
          shareLinkId,
          input.viewer_fingerprint ?? null,
          input.viewer_email ?? null,
          input.viewer_name ?? null,
          input.ip_address ?? null,
          input.user_agent ?? null,
          input.time_on_page ?? null,
          input.pages_viewed ?? null,
        ],
      });
    }

    const view = result.rows[0] as LinkView;

    if (input.page_times?.length) {
      await persistPageTimes(client, view.id, input.page_times);
    }

    await client.query("COMMIT");

    return { ...view, is_new_viewer: isNewViewer };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function getViewsByDay(
  joinClause: string,
  filterValue: string,
): Promise<ViewsByDay[]> {
  const results = await database.query<ViewsByDay>({
    text: `
        SELECT
          gs.day::date::text AS date,
          COUNT(lv.id)::int AS count
        FROM
          generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          ) AS gs(day)
        LEFT JOIN
          ${joinClause}
        GROUP BY
          gs.day
        ORDER BY
          gs.day
        ;`,
    values: [filterValue],
  });

  return results.rows;
}

async function getPageBreakdown(linkId: string): Promise<PageBreakdown[]> {
  const results = await database.query<PageBreakdown>({
    text: `
        SELECT
          lvp.page_number,
          AVG(lvp.time_on_page_seconds)::float AS avg_time_seconds,
          COUNT(DISTINCT lvp.link_view_id)::int AS view_count
        FROM
          link_view_pages lvp
        JOIN
          link_views lv ON lv.id = lvp.link_view_id
        WHERE
          lv.share_link_id = $1
        GROUP BY
          lvp.page_number
        ORDER BY
          lvp.page_number
        ;`,
    values: [linkId],
  });

  return results.rows;
}

async function getAnalyticsByLinkId(
  linkId: string,
): Promise<LinkAnalyticsResponse> {
  const [statsResult, viewsByDay, pageBreakdown] = await Promise.all([
    database.query<{
      total_views: number;
      unique_viewers: number;
      avg_time_on_page: number | null;
      avg_pages_viewed: number | null;
      first_viewed_at: Date | null;
      last_viewed_at: Date | null;
    }>({
      text: `
          SELECT
            COUNT(*)::int AS total_views,
            COUNT(DISTINCT viewer_fingerprint)::int AS unique_viewers,
            AVG(time_on_page)::float AS avg_time_on_page,
            AVG(pages_viewed)::float AS avg_pages_viewed,
            MIN(created_at) AS first_viewed_at,
            MAX(created_at) AS last_viewed_at
          FROM
            link_views
          WHERE
            share_link_id = $1
          ;`,
      values: [linkId],
    }),
    getViewsByDay(
      "link_views lv ON DATE(lv.created_at) = gs.day AND lv.share_link_id = $1",
      linkId,
    ),
    getPageBreakdown(linkId),
  ]);

  return {
    ...statsResult.rows[0]!,
    views_by_day: viewsByDay,
    page_breakdown: pageBreakdown,
  };
}

async function getAnalyticsByDocumentId(
  documentId: string,
): Promise<DocumentAnalyticsResponse> {
  const [statsResult, viewsByDay, topLinksResult] = await Promise.all([
    database.query<{
      total_views: number;
      unique_viewers: number;
      avg_time_on_page: number | null;
      avg_pages_viewed: number | null;
      first_viewed_at: Date | null;
      last_viewed_at: Date | null;
    }>({
      text: `
          SELECT
            COUNT(lv.id)::int AS total_views,
            COUNT(DISTINCT lv.viewer_fingerprint)::int AS unique_viewers,
            AVG(lv.time_on_page)::float AS avg_time_on_page,
            AVG(lv.pages_viewed)::float AS avg_pages_viewed,
            MIN(lv.created_at) AS first_viewed_at,
            MAX(lv.created_at) AS last_viewed_at
          FROM
            share_links sl
          LEFT JOIN
            link_views lv ON lv.share_link_id = sl.id
          WHERE
            sl.document_id = $1
          ;`,
      values: [documentId],
    }),
    getViewsByDay(
      `share_links sl ON sl.document_id = $1
        LEFT JOIN link_views lv ON lv.share_link_id = sl.id AND DATE(lv.created_at) = gs.day`,
      documentId,
    ),
    database.query<TopLink>({
      text: `
          SELECT
            sl.id AS link_id,
            sl.label,
            COUNT(lv.id)::int AS total_views
          FROM
            share_links sl
          LEFT JOIN
            link_views lv ON lv.share_link_id = sl.id
          WHERE
            sl.document_id = $1
          GROUP BY
            sl.id, sl.label
          ORDER BY
            total_views DESC
          LIMIT
            5
          ;`,
      values: [documentId],
    }),
  ]);

  return {
    ...statsResult.rows[0]!,
    views_by_day: viewsByDay,
    top_links: topLinksResult.rows,
  };
}

const linkView: LinkViewModel = {
  recordView,
  getAnalyticsByLinkId,
  getAnalyticsByDocumentId,
};

export default linkView;
