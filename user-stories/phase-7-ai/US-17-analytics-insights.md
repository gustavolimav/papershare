# US-17 — Analytics Insights (Natural Language Summaries)

---

**User Story: Analytics Insights**

**As a** document owner reviewing analytics,
**I want to** receive a natural language summary of how my document is performing,
**So that** I can understand viewer engagement trends without having to interpret charts and numbers myself.

**Acceptance Criteria:**

- [ ] A new authenticated endpoint `GET /api/v1/documents/[id]/analytics/insights` exists
- [ ] The endpoint requires authentication and ownership validation
- [ ] The endpoint fetches the document's analytics data (same data as US-04) and passes it to the Claude API with a prompt asking for a 3–5 sentence natural language insight summary
- [ ] The response includes an `insight` string field with the generated text
- [ ] Example insight: "Seu documento foi visualizado 47 vezes por 23 pessoas únicas nos últimos 30 dias, com um pico de atividade na semana de 5 de abril. Os leitores passam em média 4 minutos e 32 segundos lendo — acima da média para documentos deste tipo. O link 'Investidores' gerou 80% do tráfego total."
- [ ] The insight is generated in Portuguese (pt-BR) regardless of the document's language
- [ ] The insight is cached: if the analytics data hasn't changed since the last generation (same `total_views` and `last_viewed_at`), the cached insight is returned without calling the Claude API again
- [ ] Cache is stored in a new `analytics_insights` table or as a `cached_insight TEXT` + `insight_generated_at TIMESTAMPTZ` on the `documents` row
- [ ] Returns `null` for `insight` if there are no views yet, with a friendly message: `"Nenhuma visualização ainda para gerar insights."`
- [ ] Rate limit: max 10 insight generations per document per day (protect API costs)
- [ ] The analytics page (US-12) displays this insight in a highlighted card above the charts

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/[id]/analytics/insights.ts` *(create)*
  - `models/analyticsInsights.ts` *(create — fetches analytics, builds prompt, calls Claude, caches result)*
  - `infra/migrations/010-add-analytics-insight-cache.sql` *(create — adds cache columns to documents or new table)*
  - `types/index.ts` *(add `AnalyticsInsightResponse` interface)*
  - `components/analytics/InsightCard.tsx` *(create — display component for the frontend)*
- Prompt structure: system = "You are a helpful analytics assistant. Respond in Brazilian Portuguese (pt-BR)." User = structured analytics data (total_views, unique_viewers, avg_time_on_page, top_links, views_by_day) formatted as JSON + "Please summarize these analytics in 3-5 sentences for the document owner, highlighting the most notable trends."
- Cache invalidation: compare `total_views` and `last_viewed_at` from the current analytics against what was stored at insight generation time. If they match, return cached insight.
- Use `claude-haiku-4-5-20251001` model for cost efficiency.
- Dependencies / considerations:
  - Requires US-04 (document analytics endpoint) and US-14/US-15 (Anthropic SDK integration)
  - The caching strategy avoids runaway API costs; document this clearly in the model
