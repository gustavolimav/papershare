# US-45 — Analytics Dashboard Restyle

---

**User Story: Analytics Dashboard Restyle**

**As a** document owner,
**I want** the per-document analytics page to match the new visual identity,
**So that** the heatmap, AI insight, and viewer engagement list feel like part of the same considered product.

**Acceptance Criteria:**

- [ ] `app/(app)/documents/[id]/analytics/page.tsx` and its stat cards
      (Visualizações totais/Visitantes únicos/Tempo médio/Conclusão
      média): restyle to new tokens/typography, no data change.
- [ ] The page-attention bar chart (heatmap): restyle bars to the new
      `--primary` scale — per the prototype, higher-attention pages get
      the full-strength `--primary` color and lower-attention pages get
      a lighter tint of the same hue (not a different color), so the
      chart still reads as one continuous gradient of the same accent.
- [ ] The AI-insight callout: restyle to a soft `--primary`-tinted
      background card with a sparkle icon (`lucide-react`'s `Sparkles`)
      and bold "Insight da IA:" lead-in — same content/copy source as
      today (`models/analyticsInsights.ts`'s output), no change to when
      it's shown/hidden (still respects the existing BYOK/AI-configured
      gating).
- [ ] Per-viewer engagement list: restyle rows (avatar-initial circle,
      name/email, time/percent-read/visit-count, score badge using the
      new `--score-*` tokens from US-39, "Gerar follow-up" button) — no
      change to the existing Free/Pro gating that nulls this list on
      Free-plan workspaces (US-36).
- [ ] Manual browser verification: a document with real view history
      across several viewers, at least one with a low score and one with
      a high score, confirming the color-coding and chart render
      correctly in both themes.

**Technical Context:**

- Relevant files:
  - `app/(app)/documents/[id]/analytics/page.tsx` _(modify)_
  - Whatever chart/list components this page currently composes (audit `app/(app)/documents/[id]/analytics/page.tsx`'s imports at implementation time — styling only, no prop changes)
- Depends on: US-40 (branches off its branch — needs the page already living at `app/(app)/documents/[id]/analytics/`).
- Disjoint from US-43/US-44 (different route, no shared component edits expected).
