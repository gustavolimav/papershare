# US-09 — Dashboard: Document List & Upload

---

**User Story: Document Dashboard**

**As an** authenticated user,
**I want to** see all my uploaded documents in a dashboard and upload new ones,
**So that** I can manage my document library from a central place.

**Acceptance Criteria:**

- [ ] A dashboard page exists at `pages/dashboard.tsx`, accessible only to authenticated users (unauthenticated users are redirected to `/login`)
- [ ] The page fetches and displays the authenticated user's documents using `GET /api/v1/documents` via SWR
- [ ] Each document card/row shows: title, file type icon (PDF/DOCX/PPTX), file size (human-readable, e.g., "2.3 MB"), page count (if available), upload date, and a link to the document detail page
- [ ] A "Upload Document" button opens a file picker or drag-and-drop zone
- [ ] The upload accepts PDF, DOCX, and PPTX files only; other types are rejected with an inline error message
- [ ] Files exceeding the size limit (50 MB default) are rejected client-side before the upload starts
- [ ] On upload, the file is submitted as `multipart/form-data` to `POST /api/v1/documents` with `title` defaulting to the filename (without extension), and the document list is refreshed via `mutate()` after success
- [ ] An upload progress indicator is shown during the upload
- [ ] If the document list is empty, an empty state is shown: "Nenhum documento ainda. Faça o upload do seu primeiro arquivo."
- [ ] Pagination is supported: 10 documents per page, with next/previous controls; uses `page` query param in the API call
- [ ] Documents can be deleted from the list with a confirmation dialog; calls `DELETE /api/v1/documents/[id]` and refreshes the list
- [ ] The page shows a loading skeleton while documents are being fetched

**Technical Context:**

- Relevant files:
  - `pages/dashboard.tsx` *(create)*
  - `components/documents/DocumentList.tsx` *(create)*
  - `components/documents/DocumentCard.tsx` *(create)*
  - `components/documents/UploadZone.tsx` *(create — drag-and-drop + file picker)*
  - `components/ui/ConfirmDialog.tsx` *(create — reusable confirm modal)*
  - `components/ui/Skeleton.tsx` *(create — loading placeholder)*
  - `lib/formatters.ts` *(create — `formatFileSize(bytes)`, `formatDate(iso)` helpers)*
- The upload form needs `encType="multipart/form-data"` and should submit `file` (the file binary) and `title` (string) as form fields — matching what the existing `POST /api/v1/documents` handler expects via `formidable`
- SWR key for document list: `'/api/v1/documents?page=1&per_page=10'`; use `useSWR` with `mutate` for post-upload revalidation
- The `GET /api/v1/documents` response already includes `{ documents: [], total: number }` — use `total` and `per_page` to calculate page count
- Dependencies / considerations:
  - Requires US-06 (AuthContext), US-07/08 (shared layout, navigation)
  - No backend changes needed — all required endpoints exist
  - For upload progress, use the `XMLHttpRequest` `progress` event or a fetch wrapper with `ReadableStream`
