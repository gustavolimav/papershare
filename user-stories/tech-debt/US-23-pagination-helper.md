# US-23 — Pagination Helper Utility

---

**User Story: Pagination Helper**

**As a** developer adding new list endpoints to Papershare,
**I want** a reusable pagination helper utility,
**So that** I don't have to duplicate offset/limit calculation and validation logic across every list endpoint.

**Acceptance Criteria:**

- [x] A `parsePagination(query)` helper exists in `infra/pagination.ts` that:
  - Accepts a Next.js query object (or raw `page` and `per_page` string values)
  - Returns `{ page: number, perPage: number, offset: number }`
  - Applies defaults: `page = 1`, `per_page = 10`
  - Clamps `per_page` to a maximum of 100
  - Throws `ValidationError` if `page` < 1 or `per_page` < 1 or either is not a valid integer (delegates to the existing `paginationSchema`/`validate` in `infra/schemas.ts` for this — no logic duplicated, just the offset math centralized)
- [x] A `buildPaginationMeta(total, page, per_page)` helper exists in the same file that returns `{ total, page, per_page, total_pages }` where `total_pages = Math.ceil(total / per_page)`
- [x] All existing paginated endpoints are refactored to use `parsePagination` — by the time this story was picked up there were four, not one (see Resolution note): `GET /api/v1/documents`, `GET /api/v1/activity` (US-52), `GET /api/v1/workspaces/[id]/links` (US-53), `GET /api/v1/workspaces/[id]/contacts` (US-54)
- [x] The helpers are covered by the existing integration tests for all four list endpoints (their pre-existing pagination tests exercise `parsePagination` end-to-end; see Resolution note on why `buildPaginationMeta` isn't wired into any response yet)
- [x] TypeScript types for `PaginationParams` and `PaginationMeta` are added to `types/index.ts`

**Technical Context:**

- Relevant files:
  - `infra/pagination.ts` _(create)_
  - `types/index.ts` _(add `PaginationParams`, `PaginationMeta`)_
  - `pages/api/v1/documents/index.ts` _(refactor to use helpers)_
  - `models/document.ts → findAllByUserId()` _(already accepts offset/limit — no change needed)_
- Current state: `GET /api/v1/documents` has inline pagination parsing logic. Extract it to the helper.
- The `parsePagination` helper should handle `query.page` being `string | string[] | undefined` (Next.js query type) — use `Array.isArray(v) ? v[0] : v` to normalize, then `parseInt`.
- Dependencies / considerations:
  - Low-risk, isolated refactor
  - Should be done before adding new list endpoints in Phase 5 (analytics) to avoid having to backfill
  - If US-22 (response envelope) is done first, `buildPaginationMeta` output maps cleanly to the `meta` field of the envelope

**Resolution (2026-07-22):** By the time this story was picked up,
Phases 12–14 had already added three more paginated list endpoints
beyond `/documents` (Activity Feed, Global Links Inventory, Contacts
Directory), each with its own copy of `validate(paginationSchema,
request.query)` in the route handler and `const offset = (pagination
.page - 1) * pagination.perPage` in the model — the exact duplication
this story targets, just at 4x the original scope. `parsePagination`
now wraps both steps in one call; all four route handlers
(`pages/api/v1/documents/index.ts`, `pages/api/v1/activity/index.ts`,
`pages/api/v1/workspaces/[id]/links/index.ts`, `pages/api/v1/workspaces/
[id]/contacts/index.ts`) call it once and pass the resulting
`PaginationParams` straight through to their model, which reads
`pagination.offset` instead of recomputing it. `models/document.ts`,
`models/activity.ts`, `models/shareLink.ts#findAllByWorkspaceId`, and
`models/contact.ts` all switched from an inline `{ page: number;
perPage: number }` param type to the shared `PaginationParams`.

`buildPaginationMeta` exists and is correct (verified directly), but is
**not** wired into any of the four responses — each already returns a
plain `total` that real frontend code depends on today
(`components/documents/DocumentList.tsx` already computes its own
`total_pages` client-side from that `total`, `components/dashboard/
DashboardStats.tsx` reads `total` directly), so retrofitting `meta`
into all four would be additive-but-unrequested frontend/backend
surface beyond this story's actual duplication problem. It's ready for
the next list endpoint to adopt without a redesign, matching this
story's own stated purpose ("before adding new list endpoints... to
avoid having to backfill").
