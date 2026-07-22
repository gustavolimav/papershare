# US-52 — Activity Feed: Real Backend

---

**User Story: Activity Feed Backend**

**As a** workspace member,
**I want** `/activity` to show my workspace's real, reverse-chronological
event history instead of hardcoded sample data,
**So that** I can actually see what's happening across my documents
without opening each one individually.

**Context:** `components/activity/ActivityFeed.tsx` currently ships as a
frontend-only mock (Phase 11 audit, see CHANGELOG) — a nav item and a
static event list, so the sidebar matched the design prototype ahead of
this real backend work. Research into the current schema (see
`tests/orchestrator.ts`, `models/linkView.ts`, `models/document.ts`)
found three of the prototype's five event types are queryable today with
**no schema changes**: document views, share-link creation, and
"revisits" (a viewer returning after the 30-minute dedup window closes,
which already creates a new `link_views` row). The other two — NDA
acceptance and blocked-download attempts — are **not persisted
anywhere today** (`nda_text` is link config, not an acceptance record;
`allow_download` isn't even enforced server-side, only hidden in the
UI) and would need new columns/tables plus, for blocked downloads, new
server-side enforcement. **Both are explicitly out of scope for this
story** — ship v1 with the three queryable event types, and note the
other two as a follow-up (see TODO.md's Phase 12 section).

**Acceptance Criteria:**

- [ ] New `types/index.ts` interfaces: `ActivityEvent` (`event_type:
"view" | "link_created"`, `id`, `document_id`, `document_title`,
      `actor_name: string | null`, `actor_email: string | null`,
      `link_label: string | null`, `pages_viewed: number | null`,
      `page_count: number | null`, `time_on_page: number | null`,
      `is_revisit: boolean`, `created_at: Date`) and
      `ActivityListResponse` (`{ events: ActivityEvent[]; total: number
}`), same shape convention as `DocumentListResponse`.
- [ ] New `models/activity.ts` exporting
      `findAllByWorkspaceId(workspaceId, pagination: { page: number;
    perPage: number }): Promise<ActivityListResponse>` — a `UNION
    ALL` of two shapes (mirror the join pattern in
      `models/document.ts#findAllByWorkspaceId`, lines ~90-183):
  - **view rows**: `link_views` joined to `share_links` → `documents`
    (`documents.workspace_id = $1`), selecting `viewer_name`/
    `viewer_email` as actor, `pages_viewed`/`documents.page_count`/
    `time_on_page`, and `is_revisit` computed as `EXISTS (SELECT 1 FROM
link_views lv2 WHERE lv2.share_link_id = lv.share_link_id AND
lv2.viewer_fingerprint = lv.viewer_fingerprint AND lv2.created_at <
lv.created_at)` (a viewer's 2nd+ row for the same link).
  - **link_created rows**: `share_links` joined to `documents` and
    `users` (`users.id = share_links.user_id`) for the creator's
    username as actor, with `share_links.label` as `link_label`.
  - Both branches ordered by `created_at DESC`, paginated with
    `LIMIT`/`OFFSET` (same as `document.ts`), plus a parallel `COUNT(*)`
    query over the same `UNION ALL` for `total`.
- [ ] New `pages/api/v1/activity/index.ts` — `GET` only, mirrors
      `pages/api/v1/documents/index.ts`'s `getHandler` exactly:
      `authMiddleware`, `validate(paginationSchema, request.query)`,
      call `activity.findAllByWorkspaceId(request.user!
.active_workspace_id!, { page, perPage: per_page })`, return
      `200`. No new `requireRole` call needed — same trust boundary as
      the documents list endpoint, which relies on
      `active_workspace_id` alone (a user can't set someone else's
      workspace as their own active one without already being a
      member, enforced by the existing `/workspaces/[id]/activate`
      endpoint).
- [ ] `components/activity/ActivityFeed.tsx` — replace the static
      `MOCK_ACTIVITY` array with a `useSWR<ActivityListResponse>`
      fetch against `/api/v1/activity?page=1&per_page=50` (client
      component, same `fetcher` pattern as `DocumentList.tsx`). Group
      the returned `events` client-side into "Hoje" / "Ontem" / "Esta
      semana" (compare `created_at` to the current date — same
      grouping labels the mock already uses) and render each with the
      same visual structure already built (avatar-initial circle, bold
      actor + action verb + bold document title, secondary detail
      line, right-aligned time). Per-event action text/detail:
  - `view`, not revisit: "{actor} visualizou {documento}" · detail
    `"{Math.round(pages_viewed/page_count*100)}% lido · {formatted
time_on_page}"` (fall back to just the formatted time if
    `page_count` is `null`)
  - `view`, `is_revisit: true`: "{actor} revisitou {documento}" ·
    detail omitted or a simple "revisita" label (no visit-count number
    without an extra query — keep it simple, don't over-build)
  - `link_created`: "{actor} criou um link para {documento}" · detail
    is the link label if set, otherwise omitted
  - Anonymous viewer (`actor_name`/`actor_email` both `null`): render
    "Um visitante" in place of the actor name
  - Loading and empty states: reuse the same skeleton/empty-message
    conventions already used in `DocumentList.tsx`/`AnalyticsView.tsx`
    (`Skeleton`, a centered muted-text empty message).
- [ ] Integration tests in
      `tests/integration/api/v1/activity/get.test.ts`: a view event
      appears with the right actor/detail; a share-link-created event
      appears; a second view from the same fingerprint outside the
      30-minute window (use `orchestrator.pushBackLinkViewCreatedAt`)
      shows `is_revisit: true`; events from a different workspace never
      appear; pagination (`total` and `LIMIT`/`OFFSET`) behaves like
      the documents list endpoint's existing tests.

**Technical Context:**

- Relevant files:
  - `types/index.ts` _(add `ActivityEvent`, `ActivityListResponse`,
    `ActivityModel`)_
  - `models/activity.ts` _(new)_
  - `pages/api/v1/activity/index.ts` _(new)_
  - `components/activity/ActivityFeed.tsx` _(modify — replace mock data
    with a real fetch)_
  - `tests/integration/api/v1/activity/get.test.ts` _(new)_
- No migration needed — every field this story needs already exists on
  `link_views`/`share_links`/`documents`/`users`.
- Deferred, tracked in TODO.md Phase 12: NDA-acceptance events (need a
  new `link_views.nda_accepted_at`-style column, since acceptance isn't
  persisted at all today) and blocked-download events (need both new
  persistence _and_ new server-side `allow_download` enforcement, since
  today it's a UI-only hide with no backend check).
