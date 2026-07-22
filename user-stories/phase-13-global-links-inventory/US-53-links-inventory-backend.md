# US-53 — Global Links Inventory: Real Backend

---

**User Story: Links Inventory Backend**

**As a** workspace member,
**I want** `/links` to show every share link across every document in my
workspace instead of hardcoded sample data,
**So that** I can see and copy any link without having to open each
document individually to find it.

**Context:** `components/links-inventory/LinksInventory.tsx` currently
ships as a frontend-only mock (Phase 11 audit, see CHANGELOG) — a nav
item and a static table, so the sidebar matched the design prototype
ahead of this real backend work. Unlike Phase 12's Activity Feed (which
reads `request.user.active_workspace_id` directly, since that field is
already trust-boundary-safe), this endpoint is scoped by a workspace
`id` taken from the URL path — an attacker-controllable parameter — so
it needs an explicit `workspace.requireRole()` check, same as
`GET /api/v1/workspaces/[id]/members`.

**Acceptance Criteria:**

- [ ] New `types/index.ts` interfaces: `WorkspaceLinkSummary` (`id`,
      `token`, `label: string | null`, `document_id`, `document_title`,
      `view_count: number`, `status: "active" | "expired"`,
      `created_at: Date`) and `WorkspaceLinksResponse`
      (`{ links: WorkspaceLinkSummary[]; total: number }`), same shape
      convention as `DocumentListResponse`/`ActivityListResponse`.
- [ ] `models/shareLink.ts` gains `findAllByWorkspaceId(workspaceId,
    userId, pagination: { page: number; perPage: number }):
    Promise<WorkspaceLinksResponse>`:
  - `await workspace.requireRole(workspaceId, userId, "viewer")` first
    (explicit check — the workspace id is a URL param, not the
    session's own `active_workspace_id`).
  - `share_links` joined to `documents` (`documents.workspace_id = $1`),
    selecting `documents.title AS document_title`.
  - `view_count`: `(SELECT COUNT(*)::int FROM link_views lv WHERE
lv.share_link_id = share_links.id)` — same subquery shape as
    `models/document.ts#findAllByWorkspaceId`'s `view_count`.
  - `status`: `'active'` when `is_active = true AND (expires_at IS NULL
OR expires_at > now())`, else `'expired'` — folds revoked links
    into "expired" for this table, matching the two-state badge the
    design prototype (and today's mock) already uses; a link's exact
    revoked-vs-expired distinction is still visible on its own
    document's detail page (`ShareLinkCard`'s "Revogado"/"Ativo"
    badges), which this list doesn't replace.
  - Ordered `created_at DESC`, paginated with `LIMIT`/`OFFSET` (same as
    `document.ts`), plus a parallel `COUNT(*)` query for `total`.
- [ ] New `pages/api/v1/workspaces/[id]/links/index.ts` — `GET` only,
      mirrors `pages/api/v1/workspaces/[id]/members/index.ts`'s
      `getHandler` shape: `authMiddleware`, read `id` from
      `request.query`, `validate(paginationSchema, request.query)`,
      call `shareLink.findAllByWorkspaceId(id, request.user!.id, {
page, perPage: per_page })`, return `200`.
- [ ] `components/links-inventory/LinksInventory.tsx` — replace the
      static `MOCK_LINKS` array with a `useSWR<WorkspaceLinksResponse>`
      fetch against `/api/v1/workspaces/${activeWorkspace.id}/links`
      (same `useWorkspaces()` + `fetcher` pattern as
      `TeamSettingsForm.tsx`). Keep the existing copy-link button
      (build the public URL from `token`, same as `ShareLinkCard`'s
      `publicUrl`). Loading/empty states reuse the same
      `Skeleton`/centered-muted-text conventions used elsewhere.
- [ ] Integration tests in
      `tests/integration/api/v1/workspaces/[id]/links/get.test.ts`: a
      link appears with its document's title and a `view_count` of 0;
      `view_count` increments after `orchestrator.recordView`; an
      expired link (`orchestrator.expireShareLink`) reports
      `status: "expired"`; a revoked link (`is_active: false`) also
      reports `"expired"`; a link from another workspace never appears;
      a non-member gets `403`/`404` (same as the existing
      `workspace.requireRole` behavior tested for `/members`);
      pagination behaves like the documents list endpoint's tests.

**Technical Context:**

- Relevant files:
  - `types/index.ts` _(add `WorkspaceLinkSummary`,
    `WorkspaceLinksResponse`; extend `ShareLinkModel`)_
  - `models/shareLink.ts` _(add `findAllByWorkspaceId`)_
  - `pages/api/v1/workspaces/[id]/links/index.ts` _(new)_
  - `components/links-inventory/LinksInventory.tsx` _(modify — replace
    mock data with a real fetch)_
  - `tests/integration/api/v1/workspaces/[id]/links/get.test.ts` _(new)_
- No migration needed — every field this story needs already exists on
  `share_links`/`documents`/`link_views`.
