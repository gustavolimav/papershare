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
  ViewerEngagement,
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
  country_code, user_agent, time_on_page, pages_viewed, downloaded, created_at,
  updated_at
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
            ip_address, user_agent, time_on_page, pages_viewed, downloaded
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      input.downloaded ?? false,
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
              downloaded = downloaded OR $5,
              updated_at = NOW()
            WHERE
              id = $6
            RETURNING
              ${LINK_VIEW_COLUMNS}
            ;`,
        values: [
          input.viewer_email ?? null,
          input.viewer_name ?? null,
          input.time_on_page ?? null,
          input.pages_viewed ?? null,
          input.downloaded ?? false,
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
                ip_address, user_agent, time_on_page, pages_viewed, downloaded
              )
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          input.downloaded ?? false,
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

// Document-level equivalent of getPageBreakdown, aggregating across every
// share link of the document — unlike a page-by-page breakdown across
// *different* documents (which wouldn't mean anything), every link here
// points at the exact same file, so combining them gives a real per-page
// drop-off picture instead of the cruder avg_pages_viewed estimate.
async function getPageBreakdownByDocumentId(
  documentId: string,
): Promise<PageBreakdown[]> {
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
        JOIN
          share_links sl ON sl.id = lv.share_link_id
        WHERE
          sl.document_id = $1
        GROUP BY
          lvp.page_number
        ORDER BY
          lvp.page_number
        ;`,
    values: [documentId],
  });

  return results.rows;
}

// Weighted blend of four signals into a single 0-100 "who should I follow
// up with first" score — the 2026 market trend cited in TODO.md is scoring
// viewer interest as one number instead of asking a sales/IR team to eyeball
// raw time-on-page. Weights favor completing the document (time + pages,
// 60% combined) over just showing up again or grabbing a copy, but still
// give real credit to both.
const ENGAGEMENT_TIME_TARGET_SECONDS = 120; // 2 min of engaged reading = full marks on this axis
const ENGAGEMENT_VISITS_TARGET = 3; // 3+ separate visits = full marks; signals real, repeated interest
const ENGAGEMENT_WEIGHTS = {
  time: 0.3,
  pages: 0.3,
  visits: 0.2,
  download: 0.2,
};

function computeEngagementScore(
  viewer: {
    total_time_on_page: number;
    max_pages_viewed: number;
    visit_count: number;
    downloaded: boolean;
  },
  pageCount: number | null,
): number {
  const timeScore = Math.min(
    viewer.total_time_on_page / ENGAGEMENT_TIME_TARGET_SECONDS,
    1,
  );
  // A document with no known page count (non-PDF files don't track one)
  // can't measure "% of pages viewed", so this axis contributes nothing
  // rather than guessing.
  const pagesScore = pageCount
    ? Math.min(viewer.max_pages_viewed / pageCount, 1)
    : 0;
  const visitsScore = Math.min(
    viewer.visit_count / ENGAGEMENT_VISITS_TARGET,
    1,
  );
  const downloadScore = viewer.downloaded ? 1 : 0;

  const weighted =
    timeScore * ENGAGEMENT_WEIGHTS.time +
    pagesScore * ENGAGEMENT_WEIGHTS.pages +
    visitsScore * ENGAGEMENT_WEIGHTS.visits +
    downloadScore * ENGAGEMENT_WEIGHTS.download;

  return Math.round(weighted * 100);
}

// One row per distinct viewer, aggregated across every visit they've made
// to this link — a returning viewer (outside the 30-min dedup window) has
// more than one link_views row, grouped here by fingerprint. Rows with no
// fingerprint (dedup wasn't possible) group by their own id, so they still
// show up individually instead of collapsing into one bucket.
interface ViewerAggregateRow {
  viewer_fingerprint: string | null;
  viewer_email: string | null;
  viewer_name: string | null;
  total_time_on_page: number;
  max_pages_viewed: number;
  visit_count: number;
  downloaded: boolean;
  first_viewed_at: Date;
  last_viewed_at: Date;
}

const VIEWER_AGGREGATE_SELECT = `
  MAX(viewer_fingerprint) AS viewer_fingerprint,
  (array_agg(viewer_email ORDER BY updated_at DESC) FILTER (WHERE viewer_email IS NOT NULL))[1] AS viewer_email,
  (array_agg(viewer_name ORDER BY updated_at DESC) FILTER (WHERE viewer_name IS NOT NULL))[1] AS viewer_name,
  COALESCE(SUM(time_on_page), 0)::int AS total_time_on_page,
  COALESCE(MAX(pages_viewed), 0)::int AS max_pages_viewed,
  COUNT(*)::int AS visit_count,
  BOOL_OR(downloaded) AS downloaded,
  MIN(created_at) AS first_viewed_at,
  MAX(updated_at) AS last_viewed_at
`;

async function getViewersByLinkId(
  linkId: string,
  pageCount: number | null,
): Promise<ViewerEngagement[]> {
  const results = await database.query<ViewerAggregateRow>({
    text: `
        SELECT
          ${VIEWER_AGGREGATE_SELECT}
        FROM
          link_views
        WHERE
          share_link_id = $1
        GROUP BY
          COALESCE(viewer_fingerprint, id::text)
        ;`,
    values: [linkId],
  });

  return results.rows
    .map((row) => ({
      ...row,
      engagement_score: computeEngagementScore(row, pageCount),
    }))
    .sort((a, b) => b.engagement_score - a.engagement_score);
}

// Same aggregation as getViewersByLinkId, scoped to a single viewer — used
// by the follow-up email suggestion (US-27), which only needs one viewer's
// engagement data, not the whole link's list.
async function getViewerByFingerprint(
  linkId: string,
  fingerprint: string,
  pageCount: number | null,
): Promise<ViewerEngagement | null> {
  const results = await database.query<ViewerAggregateRow>({
    text: `
        SELECT
          ${VIEWER_AGGREGATE_SELECT}
        FROM
          link_views
        WHERE
          share_link_id = $1
          AND viewer_fingerprint = $2
        GROUP BY
          viewer_fingerprint
        ;`,
    values: [linkId, fingerprint],
  });

  if (!results.rowCount) {
    return null;
  }

  const row = results.rows[0]!;

  return { ...row, engagement_score: computeEngagementScore(row, pageCount) };
}

async function getAnalyticsByLinkId(
  linkId: string,
  pageCount: number | null,
): Promise<LinkAnalyticsResponse> {
  const [statsResult, viewsByDay, pageBreakdown, viewers] = await Promise.all([
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
    getViewersByLinkId(linkId, pageCount),
  ]);

  return {
    ...statsResult.rows[0]!,
    views_by_day: viewsByDay,
    page_breakdown: pageBreakdown,
    viewers,
  };
}

async function getAnalyticsByDocumentId(
  documentId: string,
): Promise<DocumentAnalyticsResponse> {
  const [statsResult, viewsByDay, topLinksResult, pageBreakdown] =
    await Promise.all([
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
      getPageBreakdownByDocumentId(documentId),
    ]);

  return {
    ...statsResult.rows[0]!,
    views_by_day: viewsByDay,
    top_links: topLinksResult.rows,
    page_breakdown: pageBreakdown,
  };
}

const linkView: LinkViewModel = {
  recordView,
  getAnalyticsByLinkId,
  getAnalyticsByDocumentId,
  getPageBreakdownByDocumentId,
  getViewerByFingerprint,
};

export default linkView;
