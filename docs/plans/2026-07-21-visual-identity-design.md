# Phase 11 — Visual Identity & UI Redesign: Design

**Status:** Validated with the user on 2026-07-21. Ready for implementation.

**Scope:** restyle only. No new endpoints, no schema changes, no new
functionality — every screen keeps its current behavior, data, and API
calls. The only functional addition is finishing the already-half-wired
dark mode (see below), since it rides along with the token work for free.

**Source of truth:** a Claude-generated prototype (a single self-contained
HTML file, `Papershare Standalone.html`, not committed to this repo —
reviewed live in-browser on 2026-07-21) covering the homepage, login,
dashboard, activity, links, contacts, analytics, an expired-link error
state, and settings. Screenshots were taken of every page in both light
and dark mode as the actual reference for this doc.

---

## Key decisions

| Decision                         | Choice                                                                                                                                                                                                                                                                                                                                             | Why                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google OAuth button in prototype | **Ignore** — not built. Login stays email/password only.                                                                                                                                                                                                                                                                                           | Confirmed with the user: the prototype's "Continuar com o Google" is decoration, not a requirement. Adding real OAuth is a new feature, not a restyle, and would need its own design pass.                                                                                                                            |
| Dark mode                        | Finish wiring it: add a real `ThemeProvider` + toggle. The `.dark` CSS class, its token values, and `next-themes` are already installed/half-wired (`components/ui/sonner.tsx` already calls `useTheme()`) but nothing ever renders a `ThemeProvider` or flips the class today.                                                                    | This is completing existing, already-committed infrastructure, not new scope — doing the token pass without finishing this would leave `useTheme()` permanently returning a meaningless default.                                                                                                                      |
| Sidebar app shell scope          | Wraps every **authenticated** page (`/dashboard`, `/documents/[id]`, `/documents/[id]/analytics`, `/settings`, `/superadmin/*`) via a new `app/(app)/layout.tsx` route group. Public/pre-auth pages (`/`, `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/em-breve`) keep today's plain `Header`/`Footer` top-nav pattern. | Matches the prototype exactly — its top nav bar (Painel/Atividade/Links/Contatos/Configurações) only ever appears once "logged in", while Página inicial/Entrar keep a normal marketing header. `/em-breve` isn't in the prototype's page set; leaving it as-is avoids inventing a design for a page nobody reviewed. |
| Sidebar nav items                | Only **Documentos** and **Configurações** are real links for now. **Atividade**, **Links**, and **Contatos** are _not_ added as nav items yet.                                                                                                                                                                                                     | Those three pages don't exist — they're Phases 12–14, still unscoped. Shipping dead links (or placeholder pages nobody asked for) is worse than adding the nav item the same PR that ships the page it points to. The shell's layout leaves room for them; each phase adds its own item when it lands.                |
| Story slicing                    | 9 stories: tokens → app shell → 7 independent page restyles (homepage, auth, dashboard, document detail, analytics, settings, public/error states).                                                                                                                                                                                                | Mirrors the prototype's own page list. Every story after the app shell touches a disjoint set of files (different route + its own components), so they can be built in parallel once the shell exists.                                                                                                                |
| Fonts                            | `Source Serif 4` (headings) + `Manrope` (body), both via `next/font/google` — same mechanism already used for `Inter` today, just swapped.                                                                                                                                                                                                         | No new font-loading infrastructure needed; `next/font/google` already self-hosts and subsets both of these.                                                                                                                                                                                                           |

---

## Design tokens

All values are additions/edits to `app/globals.css`'s existing `@theme`
block — same shadcn-CSS-variable structure already in place, only the
values change. Palette translated from the prototype's screenshots into
the existing token names (`--background`, `--primary`, etc.) so every
component that already reads `bg-background`/`bg-primary`/etc. picks up
the new look with no component-level changes.

**Light mode**

| Token                            | Value (approx., refine against screenshots while implementing)                       | Prototype reference                            |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `--background`                   | `oklch(0.98 0.01 60)` — warm cream                                                   | page background on every screenshot            |
| `--foreground`                   | `oklch(0.22 0.02 40)` — near-black, warm-biased                                      | body text, serif headings                      |
| `--card`                         | `oklch(0.995 0.005 60)` — slightly lighter than background                           | dashboard stat cards, settings card, auth card |
| `--primary`                      | `oklch(0.58 0.16 38)` — terracotta/rust                                              | primary buttons, active nav item, accent bar   |
| `--primary-foreground`           | near-white                                                                           | button label text                              |
| `--muted-foreground`             | warm mid-gray                                                                        | secondary text ("visto há 2h", descriptions)   |
| `--border`                       | warm light gray, low contrast                                                        | card borders, input borders                    |
| `--sidebar`                      | same as `--card`                                                                     | sidebar background (white-ish card on cream)   |
| `--sidebar-accent` (active item) | pale terracotta tint                                                                 | "Documentos" active state in the prototype     |
| `--radius`                       | `0.625rem` → keep as-is (prototype's `0.5–0.625rem` already matches current default) | cards, buttons, inputs                         |

**Dark mode** — not an automatic inversion; picked to keep the same
terracotta identity legible on a warm near-black ground (per the actual
dark-mode screenshot taken from the prototype):

| Token          | Value (approx.)                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--background` | `oklch(0.16 0.015 40)` — warm near-black                                                                                    |
| `--card`       | `oklch(0.20 0.02 40)` — slightly lighter panel                                                                              |
| `--primary`    | `oklch(0.68 0.15 40)` — brighter/lighter coral (dark grounds need a lighter accent than light mode's rust to hold contrast) |
| `--foreground` | warm off-white                                                                                                              |
| `--border`     | low-opacity warm white, same pattern as today's `.dark` block                                                               |

**Status colors** (score badges, link status pills — already implicit in
the prototype's green/amber/red badges): add three semantic tokens,
`--score-good`/`--score-warn`/`--score-critical` (green/amber/red,
distinct from `--primary`), each with a light-mode and dark-mode value —
these are new tokens, not a rename of the existing chart-1..5 scale.

**Typography:** replace `Inter` in `app/layout.tsx` with `Source_Serif_4`
(mapped to a new `--font-serif` variable, used only for headings via a
`font-serif` utility on `h1`–`h3`/`CardTitle`) and `Manrope` (replacing
`--font-sans`, used everywhere else — body text, buttons, labels, nav).
Both loaded via `next/font/google`, identical mechanism to today's
`Inter`.

**Dark mode wiring:** add `ThemeProvider` (`next-themes`) to
`app/providers.tsx` (`attribute="class"`, `defaultTheme="system"`), and a
small toggle button (sun/moon icon, `lucide-react`) — placed in the new
sidebar's footer (near the user's name/plan) for authenticated pages, and
in `Header.tsx` for public pages, so both surfaces can flip it.

---

## App shell (sidebar)

New `app/(app)/layout.tsx` route group + `components/layout/AppShell.tsx`,
wrapping `/dashboard`, `/documents/[id]`, `/documents/[id]/analytics`,
`/settings`, `/superadmin/*` (moved into the group; **URLs don't
change** — route groups are path-transparent in Next.js).

Structure (left column, persistent, ~240px):

- **Logo** ("Papershare" + mark) at top, links to `/dashboard`.
- **Workspace switcher** — the existing `WorkspaceSwitcher` dropdown from
  `Header.tsx`, moved here as-is (same component, same `useWorkspaces()`
  logic, no behavior change).
- **Nav list**: "Documentos" (→ `/dashboard`, active-state highlight when
  on `/dashboard` or `/documents/[id]*`) and "Configurações"
  (→ `/settings`). A superadmin also sees "Superadmin" (→
  `/superadmin/migrations`), same conditional `user.is_superadmin` check
  `Header.tsx` already has today.
- **Footer**: user avatar (initials, same as the prototype's colored
  circle), name, plan label (reuse whatever `useAuth()`/`useWorkspaces()`
  already expose — no new fetch), and the new dark-mode toggle.

Main content area: everything each page already renders, just now
inside this shell instead of under `<Header />`. Each of the 7
page-restyle stories below only touches its own page's content — none of
them touch `AppShell.tsx` again once US-40 lands.

**Risk called out explicitly:** the existing Playwright e2e suite
(`tests/e2e/*.spec.ts`) clicks through real pages — moving nav out of
`Header` and into a sidebar could break any locator that assumed the old
header markup. US-40's acceptance criteria requires running the full
`npm run test:e2e` suite (not just `npm test`) and fixing any locator
that broke, same as how the Phase 10 e2e suite already got a real fix
folded into its own PR when it hit a genuine bug.

---

## Page-by-page notes (US-41 → US-47)

Each of these is a pure restyle of a page that already exists and
already works — the acceptance criteria are "looks like the prototype,
behaves exactly like it does today." No component listed here changes
its props, its data fetching, or its API calls.

- **Homepage (US-41)** — restyle the existing four feature sections +
  pricing table (`app/page.tsx`) to the new palette/type; hero rewritten
  to match the prototype's "Envie. Veja o que acontece depois." framing
  and badge/CTA-pair layout. `Header`/`Footer` (public variant) restyled
  too, since every other public/auth page reuses them.
- **Auth (US-42)** — `/login`, `/register`: centered card, segmented
  Entrar/Criar-conta look (each page already links to the other, so this
  is styling the existing two pages consistently, not building a new
  tab-switcher component that fakes SPA navigation). No Google button
  (see Key Decisions).
- **Dashboard (US-43)** — `DocumentList`/`DocumentCard` become a data
  table (Nome/Visualizações/Links/Pontuação/Atualizado) with a
  file-type icon chip and a color-coded score badge (reuse the new
  `--score-*` tokens); add the 4-stat-card row (Documentos, Visualizações
  · 7 dias, Links ativos, Engajamento médio) with a trend delta — reads
  data the dashboard already fetches/can derive; if a real trend
  (vs. prior period) needs a new aggregation, keep it as a clearly-marked
  TODO comment rather than inventing an endpoint, since this phase adds
  no backend.
- **Document detail & share-link manager (US-44)** — restyle
  `/documents/[id]`, no behavior change.
- **Analytics (US-45)** — restyle the heatmap (bar chart, dark terracotta
  = high attention per the screenshot), the AI-insight callout (peach
  background, sparkle icon), and the per-viewer engagement list —
  same component, same props.
- **Settings (US-46)** — convert the current stacked-sections layout to
  the prototype's left-side tab list (Perfil/Chave de IA/Equipe/
  Faturamento/Zona de perigo) within the page — this is a layout change
  to `app/settings/page.tsx` only (tabs instead of `<Separator>`-divided
  sections); each section's own form component is unchanged.
- **Public + error states (US-47)** — restyle `/view/[token]` (viewer
  chrome, password/NDA gates) and add the "Desenvolvido com Papershare"
  attribution footer (new, light branding on pages seen by
  non-customers); audit and restyle 404/revoked/expired states to match
  the prototype's centered-icon-card pattern (icon circle, serif heading,
  description, single CTA).

---

## Sequencing & delivery

1. **US-39 (design tokens)** — lands first, alone. Touches only
   `app/globals.css`, `app/layout.tsx`, `app/providers.tsx`, and adds the
   theme toggle. Every other story is built on top of this.
2. **US-40 (app shell)** — branches off US-39, lands second. The one
   story every page-restyle story below depends on.
3. **US-41 → US-47** — each branches off US-40, independently, and can
   be implemented in parallel (disjoint files). Each opens its own PR
   against US-40's branch.

Each story runs the full Definition of Done (`npm run sf`, `npx tsc
--noEmit`, `npm test`) before being considered done; US-40 additionally
runs `npm run test:e2e` given the locator-breakage risk called out above.
Because `npm test`/`npm run test:e2e` need the shared local Postgres +
dev server, they are not run concurrently across stories even when the
coding happens in parallel worktrees — verification is serialized.
