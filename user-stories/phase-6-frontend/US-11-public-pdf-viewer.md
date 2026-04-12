# US-11 — Public PDF Viewer

---

**User Story: Public PDF Viewer**

**As a** document recipient who received a share link,
**I want to** view a shared document in my browser through a clean, secure viewer,
**So that** I can read the content without needing a Papershare account, and without being able to download it if the owner disabled downloads.

**Acceptance Criteria:**

- [ ] A public viewer page exists at `pages/view/[token].tsx` (no authentication required)
- [ ] On load, the page calls `GET /api/v1/share/[token]` to validate the link
- [ ] If the link requires a password, a password entry form is shown before the document is rendered; the password is sent as a query param or header in subsequent requests
- [ ] If the link is expired (403) or revoked (403), a clear error page is shown: "Este link expirou." / "Este link foi revogado."
- [ ] If the token does not exist (404), a 404 error page is shown
- [ ] Once validated, the document file is fetched and rendered using PDF.js (for PDF documents)
- [ ] The viewer shows page navigation controls (previous / next page, current page / total pages)
- [ ] The viewer shows a zoom control (zoom in / out / fit page)
- [ ] If `allow_download` is `false` on the share link, the browser's native download/print controls are suppressed and no download button is shown
- [ ] If `allow_download` is `true`, a "Download" button is shown that triggers a file download
- [ ] A view event is recorded by calling `POST /api/v1/share/[token]/view` on page load (with `viewer_fingerprint` computed from browser signals)
- [ ] Time on page is tracked and sent via a final `POST /api/v1/share/[token]/view` call on page unload (`beforeunload` event) with `time_on_page` and `pages_viewed`
- [ ] Page is responsive; viewer scales appropriately on mobile

**Technical Context:**

- Relevant files:
  - `pages/view/[token].tsx` *(create)*
  - `components/viewer/PDFViewer.tsx` *(create — wraps PDF.js)*
  - `components/viewer/PasswordGate.tsx` *(create — password prompt UI)*
  - `components/viewer/ViewerControls.tsx` *(create — page nav + zoom)*
  - `lib/fingerprint.ts` *(create — generates a stable viewer fingerprint from browser signals: screen resolution, timezone, language, platform)*
- PDF.js integration: use `pdfjs-dist` npm package. Set `GlobalWorkerOptions.workerSrc` to the CDN version to avoid bundling the worker. The viewer renders each page onto a `<canvas>` element.
- To suppress downloads: set `pointer-events: none` on the canvas context and use CSS `user-select: none`. Note that determined users can still bypass this — it is a soft restriction.
- The `allow_download` flag is returned by `GET /api/v1/share/[token]` in the `ShareLinkWithDocument` response — use this value to conditionally render the download button
- The file content itself is served from the storage layer (local `/uploads/[key]` in dev). An API endpoint may be needed to proxy the file: `GET /api/v1/share/[token]/file` — check if it exists; if not, add it as part of this story. This endpoint must re-validate the token and stream the file with appropriate headers.
- Dependencies / considerations:
  - Requires US-01/02 for view recording (can be skipped if analytics not yet done — just omit the recording call)
  - Requires `pdfjs-dist` added to `package.json`
  - DOCX/PPTX rendering is out of scope — show a "Preview not available. Download to view." message for non-PDF files
