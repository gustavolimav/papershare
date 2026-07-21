# US-46 — Settings Restyle (Tab Navigation)

---

**User Story: Settings Restyle**

**As a** user,
**I want** Settings organized as tabs instead of long stacked sections,
**So that** finding Perfil/Chave de IA/Equipe/Faturamento/Zona de perigo doesn't require scrolling past every other section first.

**Acceptance Criteria:**

- [ ] `app/(app)/settings/page.tsx`: replace the current
      `<Separator>`-divided stacked-sections layout with a left-side tab
      list (Perfil / Chave de IA / Equipe / Faturamento / Zona de perigo
      — same five sections that exist today, same order) and a content
      panel on the right showing only the active tab's section. Use
      shadcn's `Tabs` primitive (or a simple local `useState` +
      conditional render if `Tabs` doesn't fit the sidebar-tab-list
      visual) — implementer's judgment on which is less code, since this
      is presentation-only.
- [ ] Each section's existing component (`ProfileForm`,
      AI-key section, `TeamSettingsForm`, `BillingSettingsForm`,
      account-deletion "Zona de perigo" section — check current
      `app/settings/page.tsx` for exact component names) renders
      unchanged inside its tab — no prop changes, no behavior changes to
      any of them.
- [ ] "Zona de perigo" tab keeps its destructive-action styling (red/
      destructive-toned label in the tab list itself, matching the
      prototype's red "Zona de perigo" tab label).
- [ ] Only one tab active at a time; switching tabs doesn't lose any
      in-progress form state in a way that differs from today's behavior
      (today, everything's always mounted since it's just scrolled — if
      switching to a `Tabs`-based unmount-on-switch pattern would discard
      an in-progress edit, prefer keeping all panels mounted and only
      toggling visibility via CSS, not conditional rendering).
- [ ] Manual browser verification: click through all five tabs, confirm
      each renders its existing content correctly, submit at least one
      form (e.g. profile update) to confirm no regression.

**Technical Context:**

- Relevant files:
  - `app/(app)/settings/page.tsx` _(modify — layout restructure only)_
  - No changes expected to any individual settings form component.
- Depends on: US-40 (branches off its branch — needs the page already living at `app/(app)/settings/`).
- Disjoint from every other Phase 11 story.
