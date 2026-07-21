# US-40 — App Shell (Sidebar Navigation)

---

**User Story: Persistent Sidebar App Shell**

**As a** logged-in user,
**I want** a persistent left-hand navigation instead of only a top header,
**So that** moving between areas of the product (and, later, Activity/Links/Contacts once those phases ship) doesn't require going back to a dashboard first.

**Acceptance Criteria:**

- [ ] New route group `app/(app)/layout.tsx` wrapping `/dashboard`,
      `/documents/[id]`, `/documents/[id]/analytics`, `/settings`, and
      `/superadmin/*` — move these page files under `app/(app)/...`
      (route groups don't add a path segment, so URLs are unchanged).
      Public/pre-auth pages (`/`, `/login`, `/register`,
      `/forgot-password`, `/reset-password/[token]`, `/em-breve`) are
      **not** moved and keep today's plain `Header`/`Footer`.
- [ ] New `components/layout/AppShell.tsx`: persistent left sidebar
      (~240px) containing, top to bottom:
  - Logo/wordmark linking to `/dashboard`.
  - The existing `WorkspaceSwitcher` (moved out of `components/layout/Header.tsx` into this file — same component logic, same `useWorkspaces()` calls, no behavior change).
  - Nav list: "Documentos" (→ `/dashboard`, active when pathname starts with `/dashboard` or `/documents`) and "Configurações" (→ `/settings`, active when pathname starts with `/settings`). Active item gets the `--sidebar-accent` background from US-39.
  - Conditional "Superadmin" nav item (→ `/superadmin/migrations`) when `user.is_superadmin`, matching `Header.tsx`'s existing conditional today.
  - Footer: user avatar (initials in a colored circle), name, plan label, and the `ThemeToggle` from US-39.
- [ ] `components/layout/Header.tsx`: remove the authenticated-user branch (workspace switcher, Dashboard/Configurações/Superadmin links) — it now only ever renders the public-page nav (Entrar/Cadastrar), since every authenticated page uses `AppShell` instead. Keep `Header`/`Footer` unchanged otherwise; they're reused as-is by every page not moved into `app/(app)/`.
- [ ] Every page moved into `app/(app)/` drops its own `<Header />`/`<Footer />` import (the layout now provides chrome) — page bodies (the actual dashboard/settings/etc. content) are otherwise untouched by this story.
- [ ] Run the full `npm run test:e2e` suite and fix any locator that broke from the header→sidebar move (e.g. a test clicking a "Dashboard" link that used to live in the header). This is the one story in this phase where an e2e regression is expected and must be fixed here, not deferred.
- [ ] Manual browser verification: navigate through `/dashboard` → `/documents/[id]` → `/settings` as a logged-in user, confirm the sidebar persists and highlights the active section; confirm `/`, `/login` still show the old top header (not a sidebar).

**Technical Context:**

- Relevant files:
  - `app/(app)/layout.tsx` _(create)_
  - `app/(app)/dashboard/page.tsx`, `app/(app)/documents/[id]/page.tsx`, `app/(app)/documents/[id]/analytics/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/superadmin/**` _(moved from `app/dashboard/`, etc. — git mv, then drop the `Header`/`Footer` import from each)_
  - `components/layout/AppShell.tsx` _(create)_
  - `components/layout/Header.tsx` _(modify — strip authenticated branch)_
  - `tests/e2e/**/*.spec.ts` _(modify only if a locator broke)_
- Depends on: US-39 (fonts/tokens/`ThemeToggle` must exist first — the sidebar footer renders `ThemeToggle`).
- **Every other Phase 11 story (US-41–US-47) branches off this one.** No later story touches `AppShell.tsx`, `app/(app)/layout.tsx`, or `Header.tsx` again — only their own page's content.
