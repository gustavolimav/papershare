# US-50 — Merge Login/Register into a Tabbed Auth Card

---

**User Story: Auth Tabs**

**As a** user landing on either `/login` or `/register`,
**I want** a segmented "Entrar / Criar conta" tab switcher at the top of
the auth card,
**So that** I can flip to the other mode without a full page reload or
hunting for the small text link at the bottom, matching the design
prototype's single tabbed auth card.

**Context (found during the post-Phase-11 visual audit):** the prototype's
login/register mockup is one screen with a segmented pill tab switcher
(`Entrar` / `Criar conta`) inside one card, toggling the form fields
shown. Our real implementation is two separate pages (`/login`,
`/register`), each with its own `Card` and only a small text link at the
bottom ("Cadastre-se" / "Entrar") to cross over.

**Acceptance Criteria:**

- [ ] New `components/forms/AuthTabs.tsx` — a segmented pill switcher
      (two buttons, "Entrar" / "Criar conta", same visual treatment as
      `SettingsTabs`' active/inactive states adapted to a horizontal
      pill instead of a vertical list) rendered above the card's
      `CardHeader`. Clicking the inactive tab **navigates** (`next/link`
      or `router.push`) to the other real route (`/login` ↔
      `/register`) — this is not a client-side-only tab swap, so both
      URLs keep working exactly as they do today (deep links, the
      homepage's `href="/register"` links, `router.push("/login")`
      calls elsewhere in the codebase, etc. all keep working unchanged).
- [ ] `app/login/page.tsx` and `app/register/page.tsx` both render
      `<AuthTabs active="login" | "register" />` immediately above their
      existing `CardHeader`, with no other structural change — same
      `LoginForm`/`RegisterForm` components, same validation, same
      submit handlers, same redirect-if-already-authenticated behavior.
- [ ] Remove the redundant bottom-of-form cross-links now that the tab
      switcher at the top does the same job — `LoginForm.tsx`'s "Não tem
      uma conta? Cadastre-se" paragraph and `RegisterForm.tsx`'s "Já tem
      uma conta? Entrar" paragraph. (Keep every other paragraph/link in
      those forms — e.g. "Esqueceu sua senha?" — untouched.)
- [ ] No change to `forgot-password`/`reset-password` pages; they don't
      appear in the prototype's tab pattern and aren't in scope here.
- [ ] Manual browser verification: from `/login`, click "Criar conta" —
      confirm it navigates to `/register` and the tab switcher shows
      "Criar conta" active; from `/register`, click "Entrar" — confirm
      it navigates to `/login`. Confirm a real login and a real
      registration still both work end-to-end (this is a pure layout
      change, no behavior change).

**Technical Context:**

- Relevant files:
  - `components/forms/AuthTabs.tsx` _(new)_
  - `app/login/page.tsx`, `app/register/page.tsx` _(modify — render
    `AuthTabs`)_
  - `components/forms/LoginForm.tsx`, `components/forms/RegisterForm.tsx`
    _(modify — remove the now-redundant bottom cross-link paragraph
    only)_
- No API, model, or type changes. No test changes expected —
  `tests/e2e/billing-tab-and-homepage.spec.ts` only checks that
  `href="/register"` links exist on the homepage, and no e2e/integration
  test drives the login/register **forms** through the browser (they use
  `orchestrator.createUserSession()`/direct API calls instead, per
  `tests/e2e/helpers.ts`), so this is low risk.
- Depends on: none (both pages already live at their final `app/`
  locations; this is a Phase 11 restyle-scope story, disjoint from
  US-48/US-49/US-51).
