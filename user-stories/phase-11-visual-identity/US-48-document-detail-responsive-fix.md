# US-48 — Document Detail: Fix Action-Row Overflow at Narrow Widths

---

**User Story: Document Detail Responsive Fix**

**As a** user viewing a document's detail page on a narrower viewport
(split-screen laptop, tablet, small window),
**I want** the header actions and each share link's action buttons to wrap
onto a second line instead of being clipped off the edge of the screen,
**So that** I can always see and click "Editar", "Revogar", "Duplicar",
etc., no matter how wide my window is.

**Context (found during the post-Phase-11 visual audit):** at viewport
widths below ~700px, `DocumentMeta.tsx`'s title/actions row and
`ShareLinkCard.tsx`'s Editar/Revogar/Duplicar row both overflow their
container — the last button(s) render partially or fully off-screen with
no wrap and no horizontal scroll affordance. Every other restyled surface
(Dashboard's stat-card grid, Settings' tab list) already reflows correctly
at the same widths, so this is an isolated gap in two components, not a
systemic issue.

**Acceptance Criteria:**

- [ ] `components/documents/DocumentMeta.tsx`: the title/actions header
      row (`<div className="flex items-start justify-between gap-4">`
      wrapping the `<h1>` and the Analytics/Editar buttons) wraps the
      action buttons onto their own line below the title at narrow
      widths instead of overflowing — add `flex-wrap` (and adjust the
      title container so it doesn't force the row wider than its
      parent) rather than shrinking button labels or hiding actions.
- [ ] `components/share-links/ShareLinkCard.tsx`: the
      `<div className="flex gap-2 pt-1">` row containing
      Editar/Revogar/Duplicar wraps onto multiple lines at narrow
      widths instead of overflowing — add `flex-wrap`.
- [ ] No change to any button's behavior, label, icon, or the
      desktop-width layout (at ≥ 700px the row should render identically
      to today).
- [ ] Manual browser verification: resize the browser to ~400–650px
      wide on a document with at least one share link, confirm every
      button in both rows is visible (wrapped, not clipped) and
      clickable; then confirm the desktop-width (≥ 1024px) layout is
      unchanged from before this fix.

**Technical Context:**

- Relevant files:
  - `components/documents/DocumentMeta.tsx` _(modify — add `flex-wrap`
    to the header row)_
  - `components/share-links/ShareLinkCard.tsx` _(modify — add
    `flex-wrap` to the action-button row)_
- No API, model, or type changes. Pure CSS/className fix.
- Depends on: US-44 (document detail restyle) already merged to `main`
  via PR #47 — branch off `main` once that's landed.
- Disjoint from US-49.
