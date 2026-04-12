# US-23 — Pagination Helper Utility

---

**User Story: Pagination Helper**

**As a** developer adding new list endpoints to Papershare,
**I want** a reusable pagination helper utility,
**So that** I don't have to duplicate offset/limit calculation and validation logic across every list endpoint.

**Acceptance Criteria:**

- [ ] A `parsePagination(query)` helper exists in `infra/pagination.ts` that:
  - Accepts a Next.js query object (or raw `page` and `per_page` string values)
  - Returns `{ page: number, per_page: number, offset: number }`
  - Applies defaults: `page = 1`, `per_page = 10`
  - Clamps `per_page` to a maximum of 100
  - Throws `ValidationError` if `page` < 1 or `per_page` < 1 or either is not a valid integer
- [ ] A `buildPaginationMeta(total, page, per_page)` helper exists in the same file that returns `{ total, page, per_page, total_pages }` where `total_pages = Math.ceil(total / per_page)`
- [ ] All existing paginated endpoints are refactored to use these helpers:
  - `GET /api/v1/documents` (currently the only paginated endpoint)
- [ ] The helpers are unit-tested or covered by the existing integration tests for the documents list endpoint
- [ ] TypeScript types for `PaginationParams` and `PaginationMeta` are added to `types/index.ts`

**Technical Context:**

- Relevant files:
  - `infra/pagination.ts` *(create)*
  - `types/index.ts` *(add `PaginationParams`, `PaginationMeta`)*
  - `pages/api/v1/documents/index.ts` *(refactor to use helpers)*
  - `models/document.ts → findAllByUserId()` *(already accepts offset/limit — no change needed)*
- Current state: `GET /api/v1/documents` has inline pagination parsing logic. Extract it to the helper.
- The `parsePagination` helper should handle `query.page` being `string | string[] | undefined` (Next.js query type) — use `Array.isArray(v) ? v[0] : v` to normalize, then `parseInt`.
- Dependencies / considerations:
  - Low-risk, isolated refactor
  - Should be done before adding new list endpoints in Phase 5 (analytics) to avoid having to backfill
  - If US-22 (response envelope) is done first, `buildPaginationMeta` output maps cleanly to the `meta` field of the envelope
