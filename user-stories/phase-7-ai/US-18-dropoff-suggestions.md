# US-18 — Drop-off Rate Suggestions

---

**User Story: Drop-off Rate Suggestions**

**As a** document owner,
**I want to** receive AI-generated suggestions based on where viewers stop reading my document,
**So that** I can improve the document to better retain viewer attention.

**Acceptance Criteria:**

- [ ] The analytics insight (US-17) is extended to include a `suggestions` array alongside the `insight` text
- [ ] Each suggestion is an object: `{ type: 'drop_off' | 'engagement', message: string, page_number: number | null }`
- [ ] Drop-off suggestions are generated when `avg_pages_viewed` is significantly less than `page_count` (e.g., viewers read < 50% of the document on average)
- [ ] Example suggestion: `{ type: 'drop_off', message: 'A maioria dos leitores para de ler por volta da página 3 de 10. Considere colocar as informações mais importantes nas primeiras páginas.', page_number: 3 }`
- [ ] Engagement suggestions are generated when `avg_time_on_page` is very low (e.g., < 30 seconds), suggesting the content may be too dense or not engaging enough
- [ ] Suggestions are only generated if there are at least 5 views (not enough data with fewer)
- [ ] The `GET /api/v1/documents/[id]/analytics/insights` response is updated to include `suggestions: Suggestion[]`
- [ ] The analytics page (US-12) renders suggestions as a list below the insight card, with an icon indicating the suggestion type
- [ ] If no suggestions are applicable, `suggestions` is an empty array
- [ ] The drop-off page estimation uses `avg_pages_viewed` from the analytics data — no per-page tracking is required (that would need more granular data collection which is a future enhancement)

**Technical Context:**

- Relevant files:
  - `models/analyticsInsights.ts` *(update — extend prompt to include drop-off analysis and add `suggestions` to prompt output)*
  - `types/index.ts` *(add `Suggestion` interface, update `AnalyticsInsightResponse`)*
  - `components/analytics/SuggestionList.tsx` *(create — display component)*
- Prompt extension: add to the existing insights prompt: "Additionally, based on the drop-off data (avg_pages_viewed vs page_count), provide up to 3 actionable suggestions to improve viewer engagement. Return your response as valid JSON with the shape: `{ insight: string, suggestions: Array<{ type: string, message: string, page_number: number | null }> }`. Respond to the user in Brazilian Portuguese (pt-BR)."
- Parse the Claude response as JSON (use `JSON.parse()` on the response text); handle parse errors gracefully by returning `suggestions: []`
- The `page_number` in a drop-off suggestion should be `Math.round(avg_pages_viewed)` — the model will compute this from the provided analytics data
- Dependencies / considerations:
  - Requires US-17 (insights endpoint and caching)
  - This story extends the same endpoint and cache as US-17 — the cache key should include whether suggestions were requested (or always include them)
  - For future improvement: tracking pages_viewed per-view in the `link_views` table (US-02 already collects this) allows computing a histogram; aggregate it in US-04 and pass to this prompt for more precise drop-off analysis
