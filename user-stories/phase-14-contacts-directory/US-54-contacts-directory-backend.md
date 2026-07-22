# US-54 — Contacts / Viewer Directory: Real Backend

---

**User Story: Contacts Directory Backend**

**As a** workspace member,
**I want** `/contacts` to show every viewer who has engaged with any of my
documents, grouped by email across the whole workspace, instead of
hardcoded sample data,
**So that** I can see who's most engaged and follow up with them without
hunting through each document's own analytics separately.

**Context:** `components/contacts/ContactsList.tsx` currently ships as a
frontend-only mock (Phase 11 audit, see CHANGELOG) — a nav item and a
static contact list, so the sidebar matched the design prototype ahead
of this real backend work. Today's viewer engagement (`models/
linkView.ts#getViewersByLinkId`, US-25/US-52-adjacent) is always scoped
to one link at a time and groups by `viewer_fingerprint`; this story
groups by `viewer_email` instead, across every document in the
workspace, which is a different aggregation shape entirely — a contact
here is only identifiable if their link required an email (NDA gate or
`require_email`), so this directory is necessarily a subset of total
viewers, not everyone (same limitation already called out in TODO.md
before this story).

**Acceptance Criteria:**

- [ ] New `types/index.ts` interfaces: `WorkspaceContactSummary`
      (`viewer_email: string`, `viewer_name: string | null`,
      `document_count: number`, `last_viewed_at: Date`,
      `engagement_score: number`, `most_recent_document_id: string`,
      `most_recent_link_id: string`, `most_recent_viewer_fingerprint:
string | null`) and `WorkspaceContactsResponse` (`{ contacts:
WorkspaceContactSummary[]; total: number }`). The three
      `most_recent_*` fields exist solely so the frontend can wire
      "Gerar follow-up" to the existing per-link endpoint below, without
      a second round-trip.
- [ ] New `models/contact.ts` exporting `findAllByWorkspaceId(workspaceId,
    userId, pagination: { page: number; perPage: number }):
    Promise<WorkspaceContactsResponse>`:
  - `await workspace.requireRole(workspaceId, userId, "viewer")` first
    (explicit check, same reasoning as US-53's `findAllByWorkspaceId` —
    the workspace id is a URL param, not `active_workspace_id`).
  - `link_views` joined to `share_links` → `documents`
    (`documents.workspace_id = $1`), filtered to `viewer_email IS NOT
NULL`, grouped by `viewer_email`.
  - Per group: `COUNT(DISTINCT documents.id)` for `document_count`;
    `MAX(updated_at)` for `last_viewed_at`; the most-recent
    `viewer_name`/`document_id`/`share_link.id`/`viewer_fingerprint` via
    `array_agg(... ORDER BY updated_at DESC)` picking index `[1]` (same
    "most recent non-null value" idiom `getViewersByLinkId` already uses
    for `viewer_name`/`viewer_email`).
  - **Engagement score** — a deliberately separate blend from
    `linkView.ts#computeEngagementScore`, not a reuse: that function
    takes one link's single `pageCount`, but a contact here may have
    viewed several documents with different page counts, so "% of pages
    read" has to be normalized _per view_ (`LEAST(pages_viewed::numeric
/ documents.page_count, 1)`) and then averaged across views,
    instead of taking one link's max. Same four axes and weights as the
    per-link formula (30% time / 30% pages / 20% visits / 20%
    download, 120s and 3 visits as the "full marks" targets) for
    consistency, computed in JS after the aggregate query returns (same
    split as `getViewersByLinkId`: SQL aggregates raw signals, JS
    applies the scoring formula).
  - Ordered `last_viewed_at DESC`, paginated with `LIMIT`/`OFFSET`, plus
    a parallel `COUNT(*)` over the grouped result for `total` (same
    "wrap the aggregation in a subquery" shape as `models/activity.ts`).
- [ ] New `pages/api/v1/workspaces/[id]/contacts/index.ts` — `GET` only,
      same shape as US-53's `pages/api/v1/workspaces/[id]/links/
index.ts`: `authMiddleware`, read `id` from `request.query`,
      `validate(paginationSchema, request.query)`, call
      `contact.findAllByWorkspaceId(id, request.user!.id, { page,
perPage: per_page })`, return `200`.
- [ ] `components/contacts/ContactsList.tsx` — replace the static
      `MOCK_CONTACTS` array with a `useSWR<WorkspaceContactsResponse>`
      fetch against `/api/v1/workspaces/${activeWorkspace.id}/contacts`
      (same `useWorkspaces()` + `fetcher` pattern as
      `LinksInventory.tsx`). Add a "Gerar follow-up" flow per contact
      reusing `ViewerEngagementList.tsx`'s existing pattern: gated
      behind `useAiKeyConfigured()`, `POST
/api/v1/documents/${most_recent_document_id}/links/${most_recent_link_id}/followup-email`
      with `{ viewer_fingerprint: most_recent_viewer_fingerprint }`,
      rendering the returned `subject`/`body` inline with a copy
      button. Button is hidden/disabled when
      `most_recent_viewer_fingerprint` is `null` (same guard
      `ViewerEngagementList` already applies). Loading/empty states
      reuse the same `Skeleton`/centered-muted-text conventions used
      elsewhere.
- [ ] Integration tests in
      `tests/integration/api/v1/workspaces/[id]/contacts/get.test.ts`:
      a contact appears with the right `document_count` after viewing
      two different documents; `last_viewed_at` reflects the most
      recent view; `engagement_score` is higher for a viewer with more
      time-on-page/pages-viewed/visits/downloads than one with less; a
      view with no `viewer_email` never creates a contact row; a
      contact from another workspace never appears; a non-member gets
      `404`; pagination behaves like the links/activity endpoints'
      tests.

**Technical Context:**

- Relevant files:
  - `types/index.ts` _(add `WorkspaceContactSummary`,
    `WorkspaceContactsResponse`)_
  - `models/contact.ts` _(new)_
  - `pages/api/v1/workspaces/[id]/contacts/index.ts` _(new)_
  - `components/contacts/ContactsList.tsx` _(modify — replace mock data
    with a real fetch + wire the follow-up button)_
  - `tests/integration/api/v1/workspaces/[id]/contacts/get.test.ts`
    _(new)_
- No migration needed — every field this story needs already exists on
  `link_views`/`share_links`/`documents`.
- Out of scope, unchanged from the existing TODO.md note: viewers who
  never provided an email (no NDA gate, no `require_email`) still won't
  appear here — that's a product limitation of email-based identity,
  not a bug this story fixes.
