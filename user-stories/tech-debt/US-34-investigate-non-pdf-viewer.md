# US-34 — Investigate: Non-PDF Documents (DOCX/PPTX) Don't Show in the Viewer

---

**User Story: Investigate Non-PDF Viewer Behavior**

**As a** document owner who shared a `.docx`/`.pptx` file via a link,
**I want** to understand exactly what a recipient sees today and why it doesn't feel like "viewing the document,"
**So that** we can decide — with evidence, not guesses — whether this is a bug to fix or a missing feature to scope, before writing any code.

**This is an investigation story, not a fix.** The deliverable is a written finding (root cause + a short list of options with a recommendation), not a shipped change. A follow-up story implements whichever option is chosen.

**Current known behavior (read from the code, not yet confirmed against a real repro):**

`components/viewer/ViewerPage.tsx`'s `load()` function has a single early-return for any `document.mime_type !== "application/pdf"`:

```ts
if (link.document.mime_type !== "application/pdf") {
  setState({ status: "ready", link, fileData: new ArrayBuffer(0) });
  return;
}
```

This skips three things at once, all downstream of the same `if`:

1. The `GET /api/v1/share/[token]/file` fetch that would retrieve the actual bytes — a non-PDF file's content is never even downloaded to the browser.
2. The `POST /api/v1/share/[token]/view` call a few lines later — meaning **no view is ever recorded** for a non-PDF document (no analytics, no owner notification email, no engagement score — this was already flagged as a known gap in an earlier session, but not yet investigated or fixed).
3. Rendering falls through to a small fallback block (`ViewerPage.tsx` render logic) showing "Pré-visualização não disponível para este tipo de arquivo." plus a "Baixar arquivo" link if `allow_download` is set — otherwise nothing at all except that one sentence.

**Acceptance Criteria:**

- [ ] Reproduce firsthand: upload a real `.docx` (and separately a `.pptx`) via the dashboard, create a share link with `allow_download` both on and off, open the public `/view/[token]` URL as an anonymous visitor in each combination, and record exactly what renders (screenshot or HTML dump) — confirm whether it matches the "fallback message" behavior read from the code above, or whether something else is actually broken (blank page, client-side error, infinite loading spinner, etc.)
- [ ] Check the browser console/network tab during that repro for any thrown error or failed request — rule out a genuine crash (e.g., a rendering exception) as distinct from the intentional "not supported" message
- [ ] Confirm whether `POST /api/v1/share/[token]/view` really never fires for these mime types (check Network tab / add a temporary log), and whether that's the sole reason such links show zero views/engagement data on the analytics page even when a real person opened them
- [ ] Determine why `EXTENSION_BY_MIME_TYPE` and the `allow_download` fallback path exist at all if there's no preview — confirm the download link itself actually works end-to-end (correct filename, correct bytes, opens correctly in Word/PowerPoint) for both mime types
- [ ] Survey what "viewing a DOCX/PPTX inline" would actually require, and note the trade-offs of each, without implementing any of them:
  - Client-side rendering library (e.g., `docx-preview`, `mammoth` for `.docx` → HTML; no comparably mature option surfaced yet for `.pptx`) — quality/fidelity risk, bundle size, no watermarking support without extra work
  - Server-side conversion to PDF at upload time (e.g., LibreOffice headless in a worker/lambda) and reusing the existing PDF viewer unchanged — heavier infra, but reuses 100% of the existing viewer (watermark, chat, page analytics all keep working)
  - Embedding Microsoft's or Google's public document-viewer iframe pointed at a signed/public URL — simplest to build, but requires the file to be fetched by a third-party service (privacy/security trade-off for private documents) and doesn't work for password-protected or NDA-gated links
  - Do nothing to the preview, but fix the view-tracking gap (item above) and make the "not supported, download instead" message the deliberate, permanent behavior — cheapest, and arguably honest given DocSend/Papermark-class competitors have similar limits for non-PDF formats
- [ ] Write up findings as a short report (in the PR description or a comment on this file, not a separate doc) — root cause confirmed, whether view-tracking is really broken for non-PDF, and a recommendation among the options above with reasoning
- [ ] Do **not** implement a fix in this story — file a new, appropriately-scoped follow-up story (or amend the recommendation into the next tech-debt slot) once the investigation is complete and reviewed

**Technical Context:**

- Relevant files to read (no changes expected):
  - `components/viewer/ViewerPage.tsx` (the `load()` early-return and the non-PDF render branch, both described above)
  - `infra/schemas.ts#ALLOWED_MIME_TYPES` (confirms `.docx`/`.pptx` are accepted at upload — the gap is entirely in the viewer, not the upload validator)
  - `pages/api/v1/share/[token]/file/index.ts` and `models/shareLink.ts#getFileByToken` (confirm the file-proxy endpoint itself has no mime-type restriction and would serve non-PDF bytes fine if ever called)
  - `models/linkView.ts#recordView` / `POST /api/v1/share/[token]/view` (confirms what data never gets written when this call is skipped)
- Related, already-flagged issue (same root cause, surfaced independently in an earlier session): non-PDF documents never record any view events, so their analytics stay at zero regardless of real traffic. This investigation should confirm that diagnosis rather than re-discover it from scratch.
- No migration, no new dependency, no user-facing change in this story — purely diagnostic.
- Depends on: nothing. Can be picked up independently of Phase 9 workspace work.
