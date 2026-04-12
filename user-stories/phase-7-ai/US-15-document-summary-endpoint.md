# US-15 — Document Summary Endpoint

---

**User Story: Document Summary Endpoint**

**As a** developer or frontend consuming the Papershare API,
**I want** a dedicated endpoint to retrieve or regenerate the AI summary for a document,
**So that** the summary can be displayed in the UI and manually refreshed if needed.

**Acceptance Criteria:**

- [ ] A new authenticated endpoint `GET /api/v1/documents/[id]/summary` exists
- [ ] Returns `200` with `{ summary: string | null, generated_at: string | null }` for the document owner
- [ ] Returns `403` if the requesting user does not own the document
- [ ] Returns `404` if the document does not exist or is soft-deleted
- [ ] A new authenticated endpoint `POST /api/v1/documents/[id]/summary` triggers a synchronous (or fast async) re-summarization of the document
  - [ ] Returns `202 Accepted` immediately if summarization is queued asynchronously
  - [ ] Returns the new `{ summary, generated_at }` synchronously if feasible within a reasonable timeout (< 10s)
  - [ ] Updates `ai_summary` and a new `ai_summary_generated_at TIMESTAMPTZ` column in the `documents` table
  - [ ] Returns `429 Too Many Requests` if the user has regenerated the summary more than 3 times in the last hour (protect against API cost abuse)
- [ ] A `getSummary(documentId, userId)` and `regenerateSummary(documentId, userId)` method exist in `models/document.ts` (or a new `models/summarizer.ts`)
- [ ] Integration tests cover:
  - [ ] GET returns null summary before summarization runs
  - [ ] GET returns summary after it has been set
  - [ ] POST triggers regeneration and updates the summary
  - [ ] POST rate-limit enforced after 3 calls in 1 hour
  - [ ] 403 for non-owner on both GET and POST

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/[id]/summary.ts` *(create)*
  - `models/document.ts` *(add summary-related methods)*
  - `models/summarizer.ts` *(reuse/extend from US-14)*
  - `infra/migrations/009-add-ai-summary-generated-at.sql` *(create — adds `ai_summary_generated_at` column if not added in US-14)*
  - `types/index.ts` *(add `DocumentSummaryResponse` interface)*
- The rate-limit for summary regeneration can be implemented at the model layer with a simple SQL count: `SELECT COUNT(*) FROM summary_regeneration_log WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`. Alternatively, add a `summary_regenerated_count` and `summary_last_regenerated_at` on the documents row and reset hourly — simpler but less precise.
- The `POST` endpoint should reuse the same Claude API call from US-14 (`models/summarizer.ts`)
- Dependencies / considerations:
  - Requires US-14 (summarizer model and `ai_summary` column)
  - The `GET` endpoint is also useful to the public viewer (US-11) if summary should be shown to viewers — in that case, consider if the summary should be returned by `GET /api/v1/share/[token]` instead
