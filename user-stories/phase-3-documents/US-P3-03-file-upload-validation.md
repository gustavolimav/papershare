# US-P3-03 — File Upload & Validation

---

**User Story: File Upload & Validation**

**As a** user uploading a document,
**I want** the system to validate my file type and size before accepting it,
**So that** I get a clear error immediately if I upload an unsupported format or an oversized file, rather than discovering the problem later.

**Acceptance Criteria:**

- [ ] The `POST /api/v1/documents` endpoint accepts `multipart/form-data` with fields:
  - `file` — the binary file upload (required)
  - `title` — string (required, 1–255 chars)
  - `description` — string (optional, max 1000 chars)
- [ ] Only the following MIME types are accepted: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
- [ ] Files larger than the configured size limit (default 50 MB; configurable via `MAX_FILE_SIZE_MB` env var) are rejected with `400 ValidationError`
- [ ] If `file` is absent, a `400 ValidationError` is returned: "O arquivo é obrigatório."
- [ ] If `title` is absent or empty, a `400 ValidationError` is returned
- [ ] If the MIME type is not allowed, a `400 ValidationError` is returned listing allowed types
- [ ] `formidable` is used to parse the multipart body; Next.js body parsing is disabled for this route via `export const config = { api: { bodyParser: false } }`
- [ ] Zod schemas in `infra/schemas.ts` define the `ALLOWED_MIME_TYPES` array and `MAX_FILE_SIZE_BYTES` constant (derived from env var)
- [ ] For PDF files, `pdf-parse` is used to extract the page count; if extraction fails, `page_count` is stored as `null` (no error thrown)
- [ ] Integration tests cover: successful upload, wrong MIME type, oversized file, missing file, missing title

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/index.ts` *(POST handler)*
  - `infra/schemas.ts` *(add `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`, `documentCreateSchema`)*
  - `models/document.ts` *(`create()` method)*
  - `tests/integration/api/v1/documents/index.test.ts`
- `formidable` config: `{ maxFileSize: MAX_FILE_SIZE_BYTES, filter: ({ mimetype }) => ALLOWED_MIME_TYPES.includes(mimetype) }`
- MIME type from `formidable` may differ from browser-reported type — always validate the parsed `file.mimetype` from formidable, not the `Content-Type` header
- PDF page count extraction: `import pdfParse from 'pdf-parse'; const data = await pdfParse(fileBuffer); return data.numpages;` — wrap in try/catch, return null on failure
- The `pdf-parse` package is already a dependency
- Dependencies / considerations:
  - `formidable` must be added to `package.json` if not present
  - The test fixture `tests/fixtures/sample.pdf` is used for upload tests — ensure it exists
