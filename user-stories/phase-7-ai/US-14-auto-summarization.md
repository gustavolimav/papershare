# US-14 — Auto-Summarization on Upload

---

**User Story: Auto-Summarization on Upload**

**As a** document owner,
**I want** my uploaded document to be automatically summarized by AI when I upload it,
**So that** I don't have to write a summary myself, and viewers can immediately see what the document is about.

**Acceptance Criteria:**

- [ ] When a document is successfully uploaded via `POST /api/v1/documents`, a background summarization job is triggered asynchronously (does not block the upload response)
- [ ] The job extracts the full text from the document (PDF text extraction via `pdf-parse`; plain text extraction for DOCX/PPTX if feasible)
- [ ] The extracted text is sent to the Claude API (Anthropic) as a prompt requesting a concise 2–5 sentence summary in the same language as the document
- [ ] The resulting summary is stored in the `documents` table in a new `ai_summary TEXT` column
- [ ] A new migration `008-add-ai-summary.sql` (or next available number) adds the `ai_summary` column (nullable)
- [ ] The `DocumentResponse` type in `types/index.ts` includes `ai_summary: string | null`
- [ ] `GET /api/v1/documents/[id]` returns `ai_summary` in the response
- [ ] If summarization fails (API error, extraction error, timeout), the error is logged and `ai_summary` remains `null` — the upload is not rolled back
- [ ] A `ANTHROPIC_API_KEY` environment variable is documented in `README.md` and the `.env.example` file
- [ ] Integration test covers: document uploaded → `ai_summary` is non-null after the async job resolves (may require a polling helper or `waitFor` in tests)

**Technical Context:**

- Relevant files:
  - `infra/migrations/008-add-ai-summary.sql` *(create)*
  - `models/document.ts` *(add `updateSummary(id, summary)` method)*
  - `models/summarizer.ts` *(create — text extraction + Claude API call)*
  - `pages/api/v1/documents/index.ts` *(update POST handler to trigger summarization job)*
  - `types/index.ts` *(add `ai_summary` to `Document` and `DocumentResponse`)*
  - `.env.example` *(add `ANTHROPIC_API_KEY`)*
- Recommended approach for the async job: since Next.js API routes are synchronous, use Node's `setImmediate()` or `process.nextTick()` to schedule the summarization after the response is sent. For production scale, a proper job queue (BullMQ, etc.) would be better — note this in a code comment.
- Claude API integration: use `@anthropic-ai/sdk` npm package. Model: `claude-haiku-4-5-20251001` (cheapest, fastest — appropriate for summarization). Prompt: `"Summarize the following document in 2-5 sentences:\n\n{extracted_text}"`. Truncate extracted text to ~10,000 tokens if the document is very long.
- Text extraction: `pdf-parse` is already a dependency. For DOCX, `mammoth` can extract plain text (add to dependencies). For PPTX, text extraction is complex — skip for now with a fallback to title-based summary.
- Dependencies / considerations:
  - Requires `@anthropic-ai/sdk` added to `package.json`
  - `ANTHROPIC_API_KEY` must be set in the environment; if absent, summarization is silently skipped
  - Do NOT run summarization in the test environment (`NODE_ENV === 'test'`) to avoid API calls in tests
