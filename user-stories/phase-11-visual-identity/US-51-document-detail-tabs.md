# US-51 — Document Detail: "Visão geral / Análises" Tab Bar

---

**User Story: Document Detail Tabs**

**As a** document owner viewing a document's detail page,
**I want** a "Visão geral / Análises" tab bar at the top, right below the
document title,
**So that** switching between the document's overview and its analytics
feels like one screen with two views, matching the design prototype,
instead of an "Analytics" button that feels like a separate destination.

**Context (found during the post-Phase-11 visual audit):** the
prototype's document detail mockup is one screen with two tabs —
"Visão geral" (underlined/active by default) and "Análises" — switching
the content shown below. Our real implementation is two separate routes,
`/documents/[id]` and `/documents/[id]/analytics`, linked only by an
"Analytics" outline button in the corner of the overview page and a
breadcrumb ("Dashboard / {título} / Analytics") on the analytics page.
Both routes need to keep working exactly as they do today — an existing
e2e test (`tests/e2e/engagement-score.spec.ts`) navigates directly to
`/documents/[id]/analytics` and asserts on its content — so this is a
navigation-styled-as-tabs treatment, not a route merge.

**Acceptance Criteria:**

- [ ] New `components/documents/DocumentTabs.tsx` — a two-item tab bar
      ("Visão geral", "Análises") in the same underlined-active-tab
      visual style the prototype uses (plain text, active tab gets a
      `border-b-2 border-primary` underline and bolder weight, inactive
      tab is muted). Takes `documentId` and `active: "overview" |
"analytics"` props; each tab is a real `next/link` to
      `/documents/${documentId}` or `/documents/${documentId}/analytics`
      — real navigation, not a client-side swap, so both URLs keep
      working unchanged.
- [ ] `app/(app)/documents/[id]/page.tsx` renders `<DocumentTabs
documentId={doc.id} active="overview" />` right below the
      existing title/actions header (`DocumentMeta`), above
      `SummaryCard`/`ShareLinkList`.
- [ ] `app/(app)/documents/[id]/analytics/page.tsx` renders the same
      `<DocumentTabs documentId={doc.id} active="analytics" />` in the
      equivalent position, replacing the current breadcrumb-style
      "Dashboard / {título} / Analytics" nav line (the tab bar plus the
      existing sidebar already make it clear where you are; a
      breadcrumb repeating the document title is redundant once tabs
      exist). Keep the page's own `<h1>Analytics</h1>` — the prototype
      shows a "{documento} — Análises" heading style; align this
      page's heading to read the same way (e.g. `{doc.title} —
Analytics`) instead of a bare "Analytics", so the document identity
      doesn't disappear now that the breadcrumb is gone.
- [ ] Remove the standalone "Analytics" button from `DocumentMeta.tsx`'s
      header actions row now that the tab bar below it does the same
      job — keep the "Editar" button (and, if present, "Excluir
      documento") untouched.
- [ ] No API, model, or type changes — this only touches the two page
      files, `DocumentMeta.tsx`, and the new `DocumentTabs.tsx`.
- [ ] Manual browser verification: from a document's overview page,
      confirm "Visão geral" renders underlined/active and clicking
      "Análises" navigates to the real `/documents/[id]/analytics` URL
      with that tab now active; from the analytics page, confirm
      clicking "Visão geral" navigates back. Re-run
      `tests/e2e/engagement-score.spec.ts` specifically (it directly
      exercises `/documents/[id]/analytics`) to confirm the tab bar
      addition doesn't break its assertions.

**Technical Context:**

- Relevant files:
  - `components/documents/DocumentTabs.tsx` _(new)_
  - `app/(app)/documents/[id]/page.tsx`,
    `app/(app)/documents/[id]/analytics/page.tsx` _(modify — render
    `DocumentTabs`; analytics page also drops its breadcrumb `<nav>`
    and adjusts its heading)_
  - `components/documents/DocumentMeta.tsx` _(modify — remove the
    "Analytics" button only)_
- Depends on: none (both routes already live at their final `app/(app)/`
  locations from US-40; this is a Phase 11 restyle-scope story, disjoint
  from US-48/US-49/US-50).
- Watch for: `tests/e2e/engagement-score.spec.ts` asserts on content at
  `/documents/[id]/analytics` — since the URL and the content below the
  tab bar are unchanged, this should keep passing, but re-run it
  explicitly rather than assuming.
