# US-22 — API Response Envelope `{ data, meta }`

---

**User Story: Consistent API Response Envelope**

**As a** developer consuming the Papershare API,
**I want** all API responses to follow a consistent `{ data, meta }` envelope format,
**So that** I can write generic client code to handle responses without special-casing each endpoint.

**Acceptance Criteria:**

- [ ] All successful API responses are wrapped in the shape `{ data: T, meta?: object }`
- [ ] All error responses retain their current shape `{ name, message, action, status }` (no change to error format)
- [ ] The `meta` field is used for pagination metadata where applicable: `{ total, page, per_page, total_pages }`
- [ ] The `ApiResponse<T>` and `PaginatedResponse<T>` types in `types/index.ts` are updated/created to reflect the envelope
- [ ] All existing API endpoints are updated to use the envelope:
  - User endpoints (`/api/v1/users/*`)
  - Session endpoints (`/api/v1/sessions`)
  - Document endpoints (`/api/v1/documents`, `/api/v1/documents/[id]`)
  - Share link endpoints
  - Share public endpoint (`/api/v1/share/[token]`)
  - Status endpoint
- [ ] All integration tests are updated to assert on `res.body.data.*` instead of `res.body.*`
- [ ] `npm test` passes after all changes

**Technical Context:**

- Relevant files:
  - `types/index.ts` *(update `ApiResponse<T>`, add `PaginatedApiResponse<T>`)*
  - All `pages/api/v1/**/*.ts` files *(wrap `res.json(result)` with `res.json({ data: result })`)*
  - All `tests/integration/**/*.test.ts` files *(update assertions)*
- This is a breaking change for any existing API consumers — document this prominently in `CHANGELOG.md` as a breaking change if the API is considered public
- Helper function to avoid repetition in every route handler:
  ```ts
  // infra/response.ts
  export function ok<T>(res: NextApiResponse, data: T, meta?: object, status = 200) {
    res.status(status).json({ data, meta });
  }
  ```
- Pagination endpoints (`GET /api/v1/documents`) currently return `{ documents, total }` — this becomes `{ data: { documents }, meta: { total, page, per_page, total_pages } }` or more cleanly `{ data: documents, meta: { total, page, per_page } }`
- Dependencies / considerations:
  - This is a high-impact refactor touching every endpoint and every test — coordinate carefully, do in one PR to avoid partial states
  - Consider doing this change before Phase 5/6/7 to avoid having to apply the pattern twice
  - The status endpoint (`GET /api/v1/status`) already returns minimal data — wrap consistently
