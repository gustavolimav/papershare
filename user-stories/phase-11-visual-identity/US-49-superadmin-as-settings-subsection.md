# US-49 — Move Superadmin + Feature Flags into Settings

---

**User Story: Superadmin as a Settings Subsection**

**As a** superadmin,
**I want** "Migrations" and "Feature flags" to live as extra tabs inside
Configurações instead of behind their own top-level "Superadmin" sidebar
item,
**So that** platform-operator tools are one consistent place
(Configurações) rather than a second, parallel navigation entry that only
some users even see.

**Context:** today `AppShell.tsx` conditionally renders a "Superadmin"
`NavLink` (only when `user.is_superadmin`) pointing at
`/superadmin/migrations`, and that page cross-links to a sibling
`/superadmin/feature-flags` page. This story folds both into
`SettingsTabs` (built in US-46) as two more tabs, visible only to
superadmins, and removes the separate sidebar item and the two
`app/(app)/superadmin/*` routes.

**Acceptance Criteria:**

- [ ] `components/settings/SettingsTabs.tsx`: extend the `TabId` union
      and `TABS` list with two new entries — `"migrations"` (label
      "Migrations") and `"feature-flags"` (label "Feature flags") —
      appended after "Zona de perigo". Add matching optional props
      (`migrations?: React.ReactNode`, `featureFlags?: React.ReactNode`)
      since these two tabs only exist for superadmins; when the prop
      isn't passed, don't render that tab button at all (filter `TABS`
      by which panels were actually provided, rather than showing an
      empty tab).
- [ ] `app/(app)/settings/page.tsx`: when `user.is_superadmin` is true,
      pass `migrations={<MigrationsPanel />}` and
      `featureFlags={<FeatureFlagsPanel />}` (reuse the existing
      `components/superadmin/MigrationsPanel.tsx` and
      `FeatureFlagsPanel.tsx` unchanged) to `SettingsTabs`; omit both
      props entirely for non-superadmins.
- [ ] `components/layout/AppShell.tsx`: remove the conditional
      "Superadmin" `NavLink` and the now-unused `ShieldCheck` import.
- [ ] Delete `app/(app)/superadmin/migrations/page.tsx`,
      `app/(app)/superadmin/feature-flags/page.tsx`, and the now-empty
      `app/(app)/superadmin/` directory. The auth checks those pages
      did (`redirect("/login")` / `redirect("/dashboard")` if not
      superadmin) move to the settings page itself — but
      `app/(app)/settings/page.tsx` already redirects unauthenticated
      users, so only the _conditional rendering_ (not a hard redirect)
      is needed for the superadmin-only tabs, since a non-superadmin
      visiting Configurações should just not see those tabs, not be
      redirected away from Settings entirely.
- [ ] The cross-links inside `MigrationsPanel`/the old pages
      ("Veja também Migrations." / "Veja também Feature flags.") are
      removed or repointed — both tools now sit one click apart as
      sibling tabs, so the inline link no longer makes sense.
      Implementer's judgment on whether `MigrationsPanel.tsx` /
      `FeatureFlagsPanel.tsx` need any internal edit for this, since
      that link text may live in the deleted page files rather than
      the panels themselves.
- [ ] Any direct link to `/superadmin/migrations` or
      `/superadmin/feature-flags` elsewhere in the codebase (grep
      before starting) is updated to `/settings`.
- [ ] Manual browser verification: as a superadmin, confirm
      Configurações shows 7 tabs total (5 existing + Migrations +
      Feature flags) and both new tabs render their existing panels
      correctly; as a non-superadmin, confirm Configurações shows only
      the original 5 tabs and the sidebar no longer has a "Superadmin"
      item for anyone.

**Technical Context:**

- Relevant files:
  - `components/settings/SettingsTabs.tsx` _(modify — add 2 optional
    tabs)_
  - `app/(app)/settings/page.tsx` _(modify — conditionally pass the 2
    new panels)_
  - `components/layout/AppShell.tsx` _(modify — remove nav item)_
  - `app/(app)/superadmin/migrations/page.tsx`,
    `app/(app)/superadmin/feature-flags/page.tsx` _(delete)_
  - `components/superadmin/MigrationsPanel.tsx`,
    `components/superadmin/FeatureFlagsPanel.tsx` _(reused as-is;
    review only for the cross-link text noted above)_
- No API, model, migration, or type changes — `is_superadmin` gating
  and the underlying `/api/v1/migrations` and `/api/v1/feature-flags`
  endpoints are untouched.
- Depends on: US-46 (Settings tab restyle) already merged to `main` via
  PR #47 — branch off `main` once that's landed.
- Disjoint from US-48.
