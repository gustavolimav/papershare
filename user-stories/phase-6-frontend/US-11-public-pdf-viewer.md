# US-11 — Public PDF Viewer

---

**User Story: Public PDF Viewer**

**As a** document recipient who received a share link,
**I want to** view a shared document in my browser through a clean, secure viewer,
**So that** I can read the content without needing a Papershare account, and without being able to download it if the owner disabled downloads.

> **Alignment note (2026-07-13):** App Router: route is
> `app/view/[token]/page.tsx`, public (no auth gate, no
> `getServerUser()` call needed). More importantly, the "Technical
> Context" note below about serving files from local `/uploads/[key]`
> is **stale** — Phase 3 deliberately went S3/MinIO-only for storage
> (see `US-P3-02`), local filesystem storage was never implemented.
> `infra/storage.ts` currently only exports `saveFile`/`deleteFile` —
> there is no read/proxy method yet. This story needs to add one
> (e.g. `storage.getFile(key): Promise<{ body: Readable; contentType:
string }>` via S3 `GetObjectCommand`) plus the
> `GET /api/v1/share/[token]/file` route below, which re-validates the
> token (reuse `shareLink.getByToken`) before streaming.

**Acceptance Criteria:**

- [ ] A public viewer page exists at `app/view/[token]/page.tsx` (no authentication required)
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
  - `app/view/[token]/page.tsx` _(create)_
  - `components/viewer/PDFViewer.tsx` _(create — wraps PDF.js)_
  - `components/viewer/PasswordGate.tsx` _(create — password prompt UI)_
  - `components/viewer/ViewerControls.tsx` _(create — page nav + zoom)_
  - `lib/fingerprint.ts` _(create — generates a stable viewer fingerprint from browser signals: screen resolution, timezone, language, platform)_
  - `infra/storage.ts` _(extend — add a `getFile(key)` method using `GetObjectCommand`, alongside the existing `saveFile`/`deleteFile`)_
  - `pages/api/v1/share/[token]/file/index.ts` _(create — proxies the file; re-validates via `shareLink.getByToken(token, password)`, then streams `storage.getFile(document.storage_key)` with the right `Content-Type`)_
- PDF.js integration: use `pdfjs-dist` npm package (already a dependency, added in Phase 3 for server-side page-count extraction — confirm the browser/client entry point works the same way, it's the same package but a different usage than the Node-side `PDFParse` class already in use). Set `GlobalWorkerOptions.workerSrc` to the CDN version to avoid bundling the worker. The viewer renders each page onto a `<canvas>` element.
- To suppress downloads: set `pointer-events: none` on the canvas context and use CSS `user-select: none`. Note that determined users can still bypass this — it is a soft restriction.
- The `allow_download` flag is returned by `GET /api/v1/share/[token]` in the `ShareLinkWithDocument` response — use this value to conditionally render the download button
- Dependencies / considerations:
  - Requires US-01/02 for view recording (can be skipped if analytics not yet done — just omit the recording call)
  - Requires `pdfjs-dist` added to `package.json` — already present
  - DOCX/PPTX rendering is out of scope — show a "Preview not available. Download to view." message for non-PDF files
