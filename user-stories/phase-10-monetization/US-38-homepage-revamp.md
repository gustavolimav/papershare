# US-38 — Homepage Revamp: Full Feature Overview & Pricing

---

**User Story: Homepage Revamp**

**As a** visitor evaluating Papershare,
**I want** the homepage to actually show everything the product does and what it costs,
**So that** I can decide to sign up (or pick a plan) without having to explore the app first to discover features that already exist.

**Acceptance Criteria:**

- [ ] `app/page.tsx`'s hero section is kept (title + subtitle + "Começar agora"/"Entrar" CTAs), lightly reworded if needed, but no structural change.
- [ ] The existing flat 3-card feature grid (upload / share links / analytics — written when only Phase 3-5 existed) is replaced with a feature showcase grouped into four themed sections, each covering what's actually shipped as of Phase 9:
  - **Documentos & Compartilhamento** — upload de PDF/DOCX/PPTX, links configuráveis (senha, expiração, controle de download).
  - **Segurança & Confiança** — gate de NDA, lista de emails permitidos, marca d'água dinâmica, branding customizado por link.
  - **Analytics & IA** — heatmap de páginas, engagement score por visualizador, resumo automático por IA, chat sobre o documento (RAG), insights de analytics em linguagem natural.
  - **Equipe** — workspaces compartilhados, papéis (owner/editor/viewer), atribuição "Enviado por".
    Each section keeps the existing `FeatureCard`-style presentation (icon + title + description) but organized under a section heading instead of one undifferentiated grid — reuse `lucide-react` icons already imported elsewhere in the app for consistency (e.g. `ShieldCheck`/`Lock` for security, `Sparkles`/`MessageSquare` for AI, `Users` for team).
- [ ] New pricing section: three cards (Free / Pro / Business), each showing the plan name, price (Free: "Grátis"; Pro: "R$29/mês"; Business: "R$99/mês"), a short feature bullet list (Free: "10 documentos, 10 links ativos"; Pro: adds "Marca d'água, NDA, lista de emails, branding, engagement score, ilimitado"; Business: adds "Workspaces em equipe"), and a CTA button to `/register` on each (pricing is informational pre-signup — actual plan selection happens after registration, in Settings → Faturamento per US-37, so this page doesn't need to know about auth state or call the checkout API).
- [ ] Final CTA section retained (or merged into the pricing section's closing state) — no dead-end scroll with nothing to click.
- [ ] All copy in pt-BR, consistent with the rest of the app's tone (direct, no marketing fluff beyond what the existing hero already uses).
- [ ] Responsive: feature sections and pricing cards stack correctly on mobile (reuse the existing `sm:grid-cols-*` Tailwind patterns already used in this file).
- [ ] Manual browser verification: load `/` logged out, confirm all four feature sections and the three pricing cards render with correct copy, and every CTA button navigates to `/register`.

**Technical Context:**

- Relevant files:
  - `app/page.tsx` _(modify — restructure feature grid into themed sections, add pricing section)_
- Depends on: nothing functionally (this is a static content page — it doesn't call any billing API), but references the pricing/limits decided in US-35/US-36's design (`docs/plans/2026-07-17-monetization-design.md`) as the source of truth for the numbers shown, so should land after those are settled to avoid the copy drifting out of sync with the real limits.
- Out of scope: this page does not integrate with Stripe or read `useWorkspaces()` — it's the logged-out marketing page (`getServerUser()` already redirects authenticated users to `/dashboard` before this renders, unchanged from today).
