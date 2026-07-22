import database from "../infra/database";
import workspace from "./workspace";
import type {
  WorkspaceContactSummary,
  WorkspaceContactsResponse,
  ContactModel,
} from "../types/index";

// Raw per-contact aggregates from the SQL query below — the scoring
// formula itself is applied afterward in JS (same split as
// models/linkView.ts#getViewersByLinkId: SQL aggregates raw signals, JS
// applies the weights).
interface ContactAggregateRow {
  viewer_email: string;
  viewer_name: string | null;
  document_count: number;
  last_viewed_at: Date;
  total_time_on_page: number;
  avg_pages_ratio: number;
  visit_count: number;
  downloaded: boolean;
  most_recent_document_id: string;
  most_recent_link_id: string;
  most_recent_viewer_fingerprint: string | null;
}

// Same four axes/weights as linkView.ts#computeEngagementScore, but a
// deliberately separate implementation, not a reuse: that function takes
// one link's single pageCount, while a contact here may have viewed
// several documents with different page counts — "% of pages read" has
// to be normalized per view (see avg_pages_ratio in the query) and
// averaged, instead of taking one link's max pages_viewed.
const ENGAGEMENT_TIME_TARGET_SECONDS = 120;
const ENGAGEMENT_VISITS_TARGET = 3;
const ENGAGEMENT_WEIGHTS = {
  time: 0.3,
  pages: 0.3,
  visits: 0.2,
  download: 0.2,
};

function computeContactEngagementScore(row: ContactAggregateRow): number {
  const timeScore = Math.min(
    row.total_time_on_page / ENGAGEMENT_TIME_TARGET_SECONDS,
    1,
  );
  const pagesScore = row.avg_pages_ratio;
  const visitsScore = Math.min(row.visit_count / ENGAGEMENT_VISITS_TARGET, 1);
  const downloadScore = row.downloaded ? 1 : 0;

  const weighted =
    timeScore * ENGAGEMENT_WEIGHTS.time +
    pagesScore * ENGAGEMENT_WEIGHTS.pages +
    visitsScore * ENGAGEMENT_WEIGHTS.visits +
    downloadScore * ENGAGEMENT_WEIGHTS.download;

  return Math.round(weighted * 100);
}

const CONTACT_AGGREGATE_QUERY = `
  SELECT
    lv.viewer_email,
    (array_agg(lv.viewer_name ORDER BY lv.updated_at DESC) FILTER (WHERE lv.viewer_name IS NOT NULL))[1] AS viewer_name,
    COUNT(DISTINCT d.id)::int AS document_count,
    MAX(lv.updated_at) AS last_viewed_at,
    COALESCE(SUM(lv.time_on_page), 0)::int AS total_time_on_page,
    COALESCE(
      AVG(
        CASE
          WHEN d.page_count > 0
            THEN LEAST(lv.pages_viewed::numeric / d.page_count, 1)
          ELSE NULL
        END
      ),
      0
    )::float AS avg_pages_ratio,
    COUNT(*)::int AS visit_count,
    BOOL_OR(lv.downloaded) AS downloaded,
    (array_agg(d.id ORDER BY lv.updated_at DESC))[1] AS most_recent_document_id,
    (array_agg(sl.id ORDER BY lv.updated_at DESC))[1] AS most_recent_link_id,
    (array_agg(lv.viewer_fingerprint ORDER BY lv.updated_at DESC))[1] AS most_recent_viewer_fingerprint
  FROM
    link_views lv
  JOIN
    share_links sl ON sl.id = lv.share_link_id
  JOIN
    documents d ON d.id = sl.document_id
  WHERE
    d.workspace_id = $1
    AND lv.viewer_email IS NOT NULL
  GROUP BY
    lv.viewer_email
`;

async function findAllByWorkspaceId(
  workspaceId: string,
  userId: string,
  pagination: { page: number; perPage: number },
): Promise<WorkspaceContactsResponse> {
  await workspace.requireRole(workspaceId, userId, "viewer");

  const offset = (pagination.page - 1) * pagination.perPage;

  const [contactsResult, countResult] = await Promise.all([
    database.query<ContactAggregateRow>({
      text: `
          SELECT * FROM (${CONTACT_AGGREGATE_QUERY}) contacts
          ORDER BY
            last_viewed_at DESC
          LIMIT
            $2
          OFFSET
            $3
          ;`,
      values: [workspaceId, pagination.perPage, offset],
    }),
    database.query<{ count: string }>({
      text: `
          SELECT COUNT(*)::text AS count FROM (${CONTACT_AGGREGATE_QUERY}) contacts
          ;`,
      values: [workspaceId],
    }),
  ]);

  const contacts: WorkspaceContactSummary[] = contactsResult.rows.map(
    (row) => ({
      viewer_email: row.viewer_email,
      viewer_name: row.viewer_name,
      document_count: row.document_count,
      last_viewed_at: row.last_viewed_at,
      engagement_score: computeContactEngagementScore(row),
      most_recent_document_id: row.most_recent_document_id,
      most_recent_link_id: row.most_recent_link_id,
      most_recent_viewer_fingerprint: row.most_recent_viewer_fingerprint,
    }),
  );

  return {
    contacts,
    total: Number(countResult.rows[0]!.count),
  };
}

const contact: ContactModel = { findAllByWorkspaceId };

export default contact;
