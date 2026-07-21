# US-41 — Homepage Restyle

---

**User Story: Homepage Restyle**

**As a** visitor,
**I want** the marketing homepage to reflect Papershare's actual visual identity,
**So that** the product looks as considered as its feature set already is.

**Acceptance Criteria:**

- [ ] `app/page.tsx`: restyle the existing hero to match the prototype —
      a small pill badge above the headline ("COMPARTILHAMENTO DE
      DOCUMENTOS, FEITO PARA GERAR CONFIANÇA"), a large serif headline
      ("Envie. Veja o que acontece depois." or an equivalent two-line
      framing kept close to the current copy's meaning), a muted
      supporting paragraph, and a primary/secondary CTA button pair
      ("Começar grátis" / "Ver um visualizador ao vivo" or equivalent to
      today's existing CTAs).
- [ ] Restyle the four existing feature sections (Documentos &
      Compartilhamento / Segurança & Confiança / Analytics & IA / Equipe
      — from US-38) to the new palette/type — same headings/copy, no
      content rewrite required beyond what's needed to fit the new
      layout.
- [ ] Restyle the existing Free/Pro/Business pricing table to the new
      palette — same three cards, same prices/features from US-38, "MAIS
      POPULAR" badge on Pro per the prototype.
- [ ] Public variant of `components/layout/Header.tsx` (Papershare
      wordmark, Produto/Preços/Documentação if those anchors exist today,
      Entrar/Cadastrar) and `Footer.tsx` restyled to the new palette —
      these are shared by every public/auth page, so this is the one
      story that touches them for real visual work (US-40 only stripped
      the authenticated branch out of `Header.tsx`).
- [ ] No change to `/register` link destinations, pricing copy, or any
      data — this is styling only.
- [ ] Manual browser verification against the prototype screenshots:
      hero, feature sections, pricing cards, header/footer in both light
      and dark mode.

**Technical Context:**

- Relevant files:
  - `app/page.tsx` _(modify)_
  - `components/layout/Header.tsx`, `components/layout/Footer.tsx` _(modify — public variant styling)_
- Depends on: US-40 (branches off its branch; needs `Header.tsx` already stripped of the authenticated branch, and the new tokens/fonts from US-39).
- Does not depend on / does not touch: `AppShell.tsx`, any `app/(app)/` page.
