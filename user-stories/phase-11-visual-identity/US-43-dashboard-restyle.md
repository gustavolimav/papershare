# US-43 — Dashboard Restyle (Data Table + Stat Cards)

---

**User Story: Dashboard Restyle**

**As a** workspace member,
**I want** the dashboard to show my documents as a scannable table with real engagement signal, instead of a plain card grid,
**So that** I can tell at a glance which documents are getting traction without opening each one.

**Scope note (read first):** the prototype's table needs
Visualizações/Links/Pontuação per document and a stat-card row with
7-day deltas — none of that is in today's `GET /api/v1/documents`
response (`DocumentListItem` only has file metadata + uploader). Per the
design doc, extending this **existing** endpoint's query with computed,
read-only aggregate fields (no new route, no migration) is in-scope —
same pattern as `WorkspaceWithRole` gaining `document_count`/
`active_link_count` in US-36. A genuinely new capability (period-over-
period trend deltas needing historical snapshots) is **not** — see below.

**Acceptance Criteria:**

- [ ] `models/document.ts`'s list query gains three computed per-document
      fields (subqueries against `link_views`/`share_links`, same
      technique as `WorkspaceWithRole`'s existing counts): `view_count`
      (total `link_views` rows across the document's links),
      `active_link_count` (its active share links), and
      `engagement_score` (reuse the existing per-viewer engagement-score
      formula from `models/linkView.ts`, aggregated to a document-level
      average — if that's a non-trivial refactor, a simpler proxy
      (e.g. average `time_on_page` normalized 0–100) is an acceptable
      first cut, called out with a comment). Add these to
      `DocumentListItem`/`DocumentResponse` in `types/index.ts`.
- [ ] `components/documents/DocumentList.tsx`/`DocumentCard.tsx` become a
      table (`Nome`/`Visualizações`/`Links`/`Pontuação`/`Atualizado`)
      with a file-type icon chip (PDF/DOC/PPT) per row and a color-coded
      score badge using the new `--score-good`/`--score-warn`/
      `--score-critical` tokens from US-39 (thresholds: your judgment,
      e.g. ≥80 good, 50–79 warn, <50 critical — document the cutoffs in
      a comment). Existing behaviors (upload zone, delete, Free-plan
      upgrade message, `canEdit`/`showUploader` gating) carry over
      unchanged.
- [ ] `app/(app)/dashboard/page.tsx` gains a 4-card stat row above the
      table: "Documentos" (from `DocumentListResponse.total`, already
      available — no new data), "Links ativos" and "Engajamento médio"
      (derivable client-side from the per-document fields above, once
      fetched), and "Visualizações · 7 dias" (sum of `view_count` is
      all-time, not 7-day — either add a simple 7-day-scoped variant of
      the same subquery, or label the card "Visualizações totais"
      instead if a time-boxed version isn't a quick addition; don't
      block this story on it).
  - **Trend deltas ("+18%", "-4") are explicitly out of scope** — they need a prior-period comparison this phase doesn't have data plumbing for. Show the raw stat only; do not fabricate a delta.
- [ ] Manual browser verification: dashboard with several documents across different engagement levels, confirming table renders correctly, score badges pick the right color, stat cards show real (not placeholder) numbers.

**Technical Context:**

- Relevant files:
  - `models/document.ts` _(modify — extend list query)_
  - `types/index.ts` _(modify — extend `DocumentListItem`)_
  - `components/documents/DocumentList.tsx`, `DocumentCard.tsx` _(modify — becomes a table; `DocumentCard` may be replaced by a `DocumentRow` component)_
  - `app/(app)/dashboard/page.tsx` _(modify — stat card row)_
  - `tests/integration/api/v1/documents/index.test.ts` _(modify — assert the new response fields exist with correct values)_
- Depends on: US-40 (branches off its branch — needs `app/(app)/dashboard/page.tsx` to already exist at that path).
- Touches `models/document.ts` and `types/index.ts` — the one story in this phase with a real (small) backend change; keep it additive-only so it can't break any existing consumer of `GET /api/v1/documents`.
