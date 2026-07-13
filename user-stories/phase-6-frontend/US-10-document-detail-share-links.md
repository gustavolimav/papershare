# US-10 — Document Detail Page & Share Link Manager

---

**User Story: Document Detail & Share Link Manager**

**As an** authenticated document owner,
**I want to** view a document's metadata and manage its share links from a dedicated page,
**So that** I can create, configure, and revoke links to control how my document is distributed.

> **Alignment note (2026-07-13):** App Router (see US-06/07). Route is
> `app/documents/[id]/page.tsx`, Server Component gate via
> `getServerUser()` + `redirect("/login")` same as US-09. Use the
> existing shadcn `Dialog` (`components/ui/dialog.tsx`) for the create/
> edit link modals and `AlertDialog` (`components/ui/alert-dialog.tsx`)
> for the delete/revoke confirmations — don't build custom modals.

**Acceptance Criteria:**

**Document Detail:**

- [ ] A document detail page exists at `app/documents/[id]/page.tsx`
- [ ] The page fetches document metadata via `GET /api/v1/documents/[id]`
- [ ] Displays: title, description, file type, file size, page count, upload date
- [ ] An "Edit" button opens an inline form to update title and/or description (calls `PATCH /api/v1/documents/[id]`)
- [ ] A "Delete Document" button with confirmation dialog deletes the document and redirects to `/dashboard`
- [ ] Unauthenticated users are redirected to `/login`
- [ ] Non-owners who try to access a document ID they don't own see a 403 error page

**Share Link Manager:**

- [ ] A "Share Links" section on the document detail page lists all existing share links via `GET /api/v1/documents/[id]/links`
- [ ] Each share link entry shows: label (or "Sem rótulo" if null), token URL (copyable), expiry (or "Sem expiração"), download allowed status, active/revoked status
- [ ] A "Copy Link" button copies the full public URL (`https://{host}/view/{token}`) to clipboard with visual feedback
- [ ] A "Create New Link" button opens a form/modal with fields:
  - Label (optional text)
  - Password (optional, type=password with show/hide toggle)
  - Expiration date (optional date picker)
  - Allow download (checkbox, default true)
- [ ] On create, calls `POST /api/v1/documents/[id]/links` and refreshes the link list
- [ ] Each link has an "Edit" button to update label, password, expiry, allow_download, and is_active (calls `PATCH /api/v1/documents/[id]/links/[linkId]`)
- [ ] Each link has a "Revoke" button with confirmation that calls `DELETE /api/v1/documents/[id]/links/[linkId]` (sets `is_active = false`) and shows the link as revoked in the list
- [ ] If no links exist, shows: "Nenhum link de compartilhamento. Crie o primeiro!"

**Technical Context:**

- Relevant files:
  - `app/documents/[id]/page.tsx` _(create — Server Component wrapper + Client Component for the interactive parts)_
  - `components/documents/DocumentMeta.tsx` _(create)_
  - `components/documents/EditDocumentForm.tsx` _(create)_
  - `components/share-links/ShareLinkList.tsx` _(create)_
  - `components/share-links/ShareLinkCard.tsx` _(create)_
  - `components/share-links/CreateShareLinkModal.tsx` _(create — built on `components/ui/dialog.tsx`)_
  - `components/share-links/EditShareLinkModal.tsx` _(create — built on `components/ui/dialog.tsx`)_
- Use `useSWR('/api/v1/documents/[id]/links', fetcher)` for the link list; call `mutate()` after create/edit/revoke
- The public link URL format should be `/view/[token]` — this matches the public viewer page (US-11)
- The `expires_at` field in the create form should be sent as an ISO 8601 string; use a native `<input type="date">` and convert the value before sending
- Dependencies / considerations:
  - Requires US-06, US-08 (auth), US-09 (dashboard navigation)
  - No backend changes needed for this story
  - The Clipboard API (`navigator.clipboard.writeText`) requires HTTPS or localhost
