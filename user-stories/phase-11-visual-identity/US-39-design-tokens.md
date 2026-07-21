# US-39 — Design Tokens & Typography

---

**User Story: Design Tokens & Typography**

**As a** user of Papershare,
**I want** the product to have a real, distinctive visual identity instead of the stock shadcn grayscale theme,
**So that** the product feels designed rather than scaffolded.

**Acceptance Criteria:**

- [ ] `app/globals.css`: replace the neutral-only `:root`/`.dark` color values with the new palette (see `docs/plans/2026-07-21-visual-identity-design.md` → "Design tokens"). Every existing token name stays (`--background`, `--primary`, `--card`, `--sidebar*`, etc.) — only values change, so no component needs editing to pick up the new look.
- [ ] Add three new semantic tokens for score/status badges: `--score-good`, `--score-warn`, `--score-critical` (light + dark values), distinct from `--primary` and the existing `--chart-*` scale. Expose them via the `@theme inline` block the same way existing colors are (`--color-score-good: var(--score-good)`, etc.) so `bg-score-good`/`text-score-good` Tailwind utilities work.
- [ ] `app/layout.tsx`: replace `Inter` with two `next/font/google` fonts — `Source_Serif_4` (as `--font-serif`) and `Manrope` (as `--font-sans`, replacing Inter's role). Add a `font-serif` Tailwind utility applied to headings (`h1`, `h2`, `h3` base styles in `globals.css`'s `@layer base`, plus `CardTitle` in `components/ui/card.tsx`) — body text, buttons, labels, and nav stay `font-sans` (Manrope).
- [ ] `app/providers.tsx`: wrap children in `next-themes`' `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). `next-themes` is already a dependency — no install needed.
- [ ] New `components/layout/ThemeToggle.tsx` — a small icon button (`Sun`/`Moon` from `lucide-react`) calling `useTheme()`'s `setTheme`, toggling between `"light"`/`"dark"`. Not wired into any page yet (that's US-40/US-42's job for the sidebar/public header respectively) — this story just builds the token plumbing + the reusable toggle component.
- [ ] Manual verification: toggle dark mode via a temporary render of `ThemeToggle` (or browser devtools `class="dark"` on `<html>`) and confirm every existing page (dashboard, settings, login) still renders legibly in both themes — this story doesn't restyle any page, so "legible, not broken" is the bar, not "matches the prototype" (that's the later stories' job).

**Technical Context:**

- Relevant files:
  - `app/globals.css` _(modify — token values only)_
  - `app/layout.tsx` _(modify — font swap)_
  - `app/providers.tsx` _(modify — add `ThemeProvider`)_
  - `components/layout/ThemeToggle.tsx` _(create)_
  - `components/ui/card.tsx` _(modify — `CardTitle` gets `font-serif`)_
- Depends on: nothing — first story of the phase.
- Every subsequent Phase 11 story branches off this one.
- `components/ui/sonner.tsx` already calls `useTheme()` — once `ThemeProvider` exists, the Toaster's theme-awareness (previously a no-op) starts working for free.
