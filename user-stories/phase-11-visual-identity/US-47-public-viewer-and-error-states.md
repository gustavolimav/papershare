# US-47 — Public Viewer & Error States Restyle

---

**User Story: Public Viewer & Error States Restyle**

**As a** document viewer (usually not a Papershare customer themselves),
**I want** the public viewing experience to look considered and trustworthy,
**So that** the first thing an external recipient sees of Papershare reflects well on both the sender and the product.

**Acceptance Criteria:**

- [ ] `app/view/[token]/page.tsx` and `components/viewer/ViewerPage.tsx`,
      `PDFViewer.tsx`, `ViewerControls.tsx`: restyle chrome (toolbar,
      background, any wrapper card) to the new tokens — no change to PDF
      rendering, download logic, or page-tracking.
- [ ] `PasswordGate.tsx`, `NdaGate.tsx`, `EmailGate.tsx`: restyle to
      match the auth-page card treatment from US-42 (centered card,
      serif heading, styled inputs) — same validation/submit behavior.
- [ ] New attribution footer — "Desenvolvido com Papershare" (small,
      muted, bottom of every public viewer page and every gate) linking
      to the marketing homepage `/`. This is genuinely new (light
      product-attribution branding), explicitly called out in the design
      doc as the one intentional non-restyle addition in this story
      besides dark mode.
- [ ] Restyle every error/empty state reachable from a public share link
      to the prototype's centered-card pattern (icon circle, serif
      heading, muted description, single CTA button): revoked link,
      expired link (confirmed in the prototype), link not found (404),
      and NDA-declined/blocked-download state if one exists today. Audit
      `ViewerPage.tsx`'s `linkResponse.status` branches (404 handling
      already exists at minimum) to find every distinct state that needs
      this treatment.
- [ ] Manual browser verification: a real share link (active, PDF),
      a link with a password gate, a link with an NDA gate, an expired
      link, and a nonexistent token — confirm the viewer and every gate/
      error state render correctly in both light and dark mode, and the
      attribution footer appears on all of them.

**Technical Context:**

- Relevant files:
  - `app/view/[token]/page.tsx` _(modify)_
  - `components/viewer/ViewerPage.tsx`, `PDFViewer.tsx`, `ViewerControls.tsx`, `PasswordGate.tsx`, `NdaGate.tsx`, `EmailGate.tsx` _(modify — styling + new footer)_
  - Whatever component(s) currently render the expired/revoked/404 states inside `ViewerPage.tsx` (no dedicated files today per a quick audit — this story may need to extract them into small presentational components to restyle cleanly; implementer's judgment)
- Depends on: US-40 for the shared design tokens/fonts (this page itself is public, not wrapped by `AppShell`, but still needs US-39's tokens which land via US-40's branch chain).
- Disjoint from every other Phase 11 story — this is the only one touching `components/viewer/*`.
