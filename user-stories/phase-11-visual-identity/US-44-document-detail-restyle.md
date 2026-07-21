# US-44 — Document Detail & Share-Link Manager Restyle

---

**User Story: Document Detail Restyle**

**As a** workspace member,
**I want** the document detail page and its share-link manager to match the new visual identity,
**So that** the core "manage a document's links" workflow feels consistent with the rest of the redesigned product.

**Acceptance Criteria:**

- [ ] `app/(app)/documents/[id]/page.tsx`, `DocumentDetailView.tsx`,
      `DocumentMeta.tsx`, `EditDocumentForm.tsx`, `SummaryCard.tsx`:
      restyle to the new tokens/typography — headings get `font-serif`,
      cards/buttons/inputs pick up the new palette automatically via
      US-39's token changes, but audit for any hardcoded gray/neutral
      Tailwind classes (e.g. `bg-gray-100`, `text-neutral-500`) that
      bypass the token system and replace them with the semantic
      token-based classes.
- [ ] `components/share-links/ShareLinkList.tsx`, `ShareLinkCard.tsx`,
      `CreateShareLinkModal.tsx`, `EditShareLinkModal.tsx`: same
      treatment — restyle only, no change to props, validation, gating
      logic (Free-plan limits/disabled fields from US-36/37 stay exactly
      as they behave today).
- [ ] No change to any data fetching, mutation, or the analytics-button
      link added in an earlier phase.
- [ ] Manual browser verification: open a document with several share
      links (mix of active/expired/password-protected), confirm the
      page and every modal render correctly in both light and dark mode.

**Technical Context:**

- Relevant files:
  - `app/(app)/documents/[id]/page.tsx` _(modify)_
  - `components/documents/DocumentDetailView.tsx`, `DocumentMeta.tsx`, `EditDocumentForm.tsx`, `SummaryCard.tsx` _(modify — styling only)_
  - `components/share-links/ShareLinkList.tsx`, `ShareLinkCard.tsx`, `CreateShareLinkModal.tsx`, `EditShareLinkModal.tsx` _(modify — styling only)_
- Depends on: US-40 (branches off its branch — needs the page already living at `app/(app)/documents/[id]/`).
- Disjoint from US-43/US-45 (different components), though all three read from the same moved `app/(app)/` tree — expect no real conflict since each touches its own page's files only.
