# US-03 — Analytics Aggregation Endpoint: Per Share Link

---

**User Story: Analytics Per Share Link**

**As a** document owner,
**I want to** retrieve aggregated analytics for a specific share link,
**So that** I can understand how each individual link is performing (total views, unique viewers, average time on page, average pages viewed).

**Acceptance Criteria:**

- [ ] A new authenticated endpoint `GET /api/v1/documents/[id]/links/[linkId]/analytics` exists
- [ ] The endpoint requires authentication (`authMiddleware`) and ownership validation (requesting user must own the document)
- [ ] Returns `200` with an analytics payload containing:
  - `total_views` — total number of rows in `link_views` for this `share_link_id`
  - `unique_viewers` — count of distinct non-null `viewer_fingerprint` values
  - `avg_time_on_page` — average `time_on_page` in seconds (null if no data)
  - `avg_pages_viewed` — average `pages_viewed` (null if no data)
  - `first_viewed_at` — timestamp of the earliest view row (null if no views)
  - `last_viewed_at` — timestamp of the most recent view row (null if no views)
  - `views_by_day` — array of `{ date: string, count: number }` for the last 30 days
- [ ] Returns `404` if the share link does not belong to the specified document
- [ ] Returns `403` if the authenticated user does not own the document
- [ ] All aggregation is done with raw SQL (no ORM, no JS-side aggregation)
- [ ] A `getAnalyticsByLinkId(linkId, userId)` method exists in `models/linkView.ts`
- [ ] Integration tests at `tests/integration/api/v1/documents/[id]/links/[linkId]/analytics/get.test.ts` covering:
  - [ ] 200 with correct totals after seeding known view rows
  - [ ] 200 with null/zero values when there are no views yet
  - [ ] 403 when requesting user does not own the document
  - [ ] 404 when `linkId` does not exist under the given document

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/[id]/links/[linkId]/analytics.ts` *(create)*
  - `models/linkView.ts` *(add `getAnalyticsByLinkId()`)*
  - `types/index.ts` *(add `LinkAnalyticsResponse` interface)*
  - `tests/integration/api/v1/documents/[id]/links/[linkId]/analytics/get.test.ts` *(create)*
- The ownership check pattern is already established in `models/shareLink.ts → findOneById()` — reuse the same pattern: join `share_links` to `documents` and verify `documents.user_id = $userId`
- The `views_by_day` array should use a SQL `generate_series` or `GROUP BY DATE(created_at)` approach; ensure the last 30 days are always represented (fill zero counts for days with no views using `generate_series`)
- Use `COALESCE(AVG(...), NULL)` pattern so that empty result sets return `null` rather than `0` for averages
- Dependencies / considerations:
  - Requires US-01 (table) and US-02 (recording endpoint) to exist
  - The `linkId` path parameter must match the `id` column of `share_links` (UUID), not the `token`
  - Pagination is not needed here — all analytics are aggregated into a single response object
