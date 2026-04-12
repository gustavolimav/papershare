# US-16 — Viewer Chat Interface (RAG)

---

**User Story: Viewer Chat Interface**

**As a** document viewer accessing a shared link,
**I want to** ask questions about the document in a chat interface,
**So that** I can quickly find specific information without reading the entire document.

**Acceptance Criteria:**

- [ ] A chat panel is available on the public viewer page (`/view/[token]`) — accessible only if the share link is valid and active
- [ ] The chat panel has an input field and a message history area
- [ ] When the user submits a question, it is sent to a new endpoint `POST /api/v1/share/[token]/chat`
- [ ] The endpoint uses a RAG (Retrieval-Augmented Generation) approach:
  1. The document's extracted text (chunked into ~500-token segments) is retrieved
  2. The question and relevant chunks are passed to the Claude API
  3. The response is streamed back to the client
- [ ] Claude's response is streamed to the UI using Server-Sent Events (SSE) or chunked transfer encoding, so the answer appears progressively
- [ ] The chat history is maintained client-side (React state) for the session — not persisted to the database
- [ ] The document's extracted text chunks are stored in a new `document_chunks` table (or in a `chunks JSONB` column on `documents`) to avoid re-extracting on every chat request
- [ ] If the share link has been revoked, expired, or requires a password that hasn't been provided, the chat endpoint returns 403
- [ ] The chat panel can be toggled open/closed in the viewer UI
- [ ] Each response includes a citation: "Baseado na página X" (page number from the relevant chunk)
- [ ] Rate limit: max 20 chat messages per share token per hour (protect API costs)

**Technical Context:**

- Relevant files:
  - `pages/api/v1/share/[token]/chat.ts` *(create)*
  - `models/chat.ts` *(create — RAG logic: chunk retrieval, prompt construction, Claude API call)*
  - `models/documentChunks.ts` *(create — text chunking and storage)*
  - `infra/migrations/009-create-document-chunks.sql` *(or 010, depending on prior migrations)*
  - `components/viewer/ChatPanel.tsx` *(create — UI for the chat interface)*
  - `types/index.ts` *(add `DocumentChunk`, `ChatMessage` interfaces)*
- Text chunking strategy: split extracted text into ~500 token chunks with 50-token overlap. Store each chunk with `document_id`, `chunk_index`, `content TEXT`, `page_number INTEGER`.
- For MVP RAG without a vector DB: use the full document text (if < 100KB) or the top N most relevant chunks based on simple keyword overlap (no embedding required). A proper vector similarity search (pgvector) is a future enhancement.
- Claude API call structure: system prompt = "You are a helpful assistant. Answer questions based only on the following document excerpts. If the answer is not in the excerpts, say so." + excerpts + user question. Use streaming API (`stream: true`).
- SSE streaming in Next.js: set `res.setHeader('Content-Type', 'text/event-stream')` and write `data: {chunk}\n\n` for each token. Use `res.flush()` after each write.
- Dependencies / considerations:
  - Requires US-14 (text extraction), US-11 (viewer page)
  - Requires `@anthropic-ai/sdk` (already added in US-14)
  - This is the most complex story in Phase 7 — consider chunking it further if needed
  - pgvector extension for semantic search is a future story; this MVP uses keyword-based retrieval
