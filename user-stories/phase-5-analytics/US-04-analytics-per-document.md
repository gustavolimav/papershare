# US-04 — Analytics Aggregation Endpoint: Per Document

---

**User Story: Analytics Per Document**

**As a** document owner,
**I want to** retrieve aggregated analytics rolled up across all share links for a document,
**So that** I can understand the overall reach of a document without having to aggregate each link manually.

**Acceptance Criteria:**

- [ ] A new authenticated endpoint `GET /api/v1/documents/[id]/analytics` exists
- [ ] The endpoint requires authentication (`authMiddleware`) and ownership validation
- [ ] Returns `200` with an analytics payload containing:
  - `total_views` — sum of all views across all share links for this document
  - `unique_viewers` — count of distinct non-null `viewer_fingerprint` values across all links
  - `avg_time_on_page` — average `time_on_page` across all links (null if no data)
  - `avg_pages_viewed` — average `pages_viewed` across all links (null if no data)
  - `first_viewed_at` — earliest view across all links (null if no views)
  - `last_viewed_at` — most recent view across all links (null if no views)
  - `views_by_day` — array of `{ date: string, count: number }` for the last 30 days (summed across all links)
  - `top_links` — array of top 5 share links by view count: `{ link_id, label, total_views }`
- [ ] Returns `403` if the authenticated user does not own the document
- [ ] Returns `404` if the document does not exist or has been soft-deleted
- [ ] All aggregation is done in raw SQL with a single efficient query (or minimal queries)
- [ ] A `getAnalyticsByDocumentId(documentId, userId)` method exists in `models/linkView.ts`
- [ ] Integration tests at `tests/integration/api/v1/documents/[id]/analytics/get.test.ts` covering:
  - [ ] 200 with correct rollup after seeding views across multiple links
  - [ ] 200 with zero/null when no views exist
  - [ ] 403 for non-owner
  - [ ] 404 for non-existent document
  - [ ] `top_links` correctly orders and limits to 5 entries

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/[id]/analytics.ts` *(create)*
  - `models/linkView.ts` *(add `getAnalyticsByDocumentId()`)*
  - `types/index.ts` *(add `DocumentAnalyticsResponse` interface)*
  - `tests/integration/api/v1/documents/[id]/analytics/get.test.ts` *(create)*
- The join path for ownership: `link_views → share_links → documents` — filter where `documents.id = $documentId AND documents.user_id = $userId AND documents.deleted_at IS NULL`
- SQL approach for `top_links`: subquery or CTE that groups `link_views` by `share_link_id`, orders by count DESC, and limits to 5; join to `share_links` to fetch `label`
- `views_by_day` logic is the same as US-03 but JOINed across all links for the document
- The ownership check for the document should call `models/document.ts → findOneById()` rather than duplicating the SQL — this method already checks deleted_at and throws ForbiddenError for non-owners
- Dependencies / considerations:
  - Requires US-01, US-02, and US-03 to be complete (or at least US-01 for the schema)
  - If a document has no share links yet, all aggregate fields should return `null` or `0` gracefully
