# US-05 — Unique Viewer Deduplication (30-min Window)

---

**User Story: Unique Viewer Deduplication**

**As a** document owner reviewing analytics,
**I want** repeat views from the same viewer within a 30-minute window to be deduplicated,
**So that** the view count reflects genuine unique visits rather than page refreshes or accidental double-counts.

**Acceptance Criteria:**

- [ ] When `POST /api/v1/share/[token]/view` is called with a `viewer_fingerprint`:
  - [ ] If a row already exists for the same `share_link_id` + `viewer_fingerprint` within the last 30 minutes, the existing row is **updated** (not a new row inserted) — `time_on_page` and `pages_viewed` are updated to the new values if provided
  - [ ] If no such row exists within the window, a new row is inserted as normal
- [ ] When `viewer_fingerprint` is absent (`null`), deduplication is skipped and a new row is always inserted
- [ ] The analytics endpoints (US-03, US-04) count `total_views` as the number of rows in `link_views` (deduplicated rows already represent one session)
- [ ] `unique_viewers` in analytics continues to count distinct `viewer_fingerprint` values (unchanged)
- [ ] The 30-minute window is calculated as `NOW() - INTERVAL '30 minutes'`
- [ ] The upsert logic is implemented inside `models/linkView.ts → recordView()` using a single SQL `INSERT ... ON CONFLICT` or an explicit `SELECT + UPDATE/INSERT` pattern
- [ ] Integration tests at `tests/integration/api/v1/share/[token]/view/post.test.ts` are extended to cover:
  - [ ] Two calls with the same fingerprint within 30 min result in only 1 row, with updated `time_on_page`
  - [ ] Two calls with the same fingerprint more than 30 min apart result in 2 rows
  - [ ] Two calls without a fingerprint always result in 2 rows
  - [ ] Two calls with different fingerprints result in 2 rows

**Technical Context:**

- Relevant files:
  - `models/linkView.ts` *(update `recordView()` with deduplication logic)*
  - `tests/integration/api/v1/share/[token]/view/post.test.ts` *(extend existing tests)*
- Recommended SQL approach — use `INSERT ... ON CONFLICT` with a partial unique index:
  ```sql
  CREATE UNIQUE INDEX idx_link_views_dedup
    ON link_views (share_link_id, viewer_fingerprint)
    WHERE viewer_fingerprint IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 minutes';
  ```
  However, partial indexes with dynamic conditions are not supported by PostgreSQL for `ON CONFLICT`. The safer approach is:
  1. `SELECT id FROM link_views WHERE share_link_id = $1 AND viewer_fingerprint = $2 AND created_at > NOW() - INTERVAL '30 minutes'`
  2. If found: `UPDATE link_views SET time_on_page = $3, pages_viewed = $4, updated_at = NOW() WHERE id = $5`
  3. If not found: `INSERT INTO link_views (...)`
  Wrap both in a transaction to avoid race conditions.
- Add an `updated_at TIMESTAMPTZ` column to `link_views` in the migration (US-01 should be updated, or add a new migration `008-add-updated-at-link-views.sql`)
- Dependencies / considerations:
  - Requires US-01 and US-02
  - The deduplication window (30 min) should ideally be a named constant in `models/linkView.ts` for easy future adjustment
  - Consider adding a composite index on `(share_link_id, viewer_fingerprint, created_at)` for query performance
