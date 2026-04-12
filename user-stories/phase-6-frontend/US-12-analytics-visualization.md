# US-12 — Analytics Visualization Page

---

**User Story: Analytics Visualization**

**As a** document owner,
**I want to** see a visual analytics dashboard for a document showing views over time, viewer engagement, and per-link performance,
**So that** I can quickly grasp how my document is being consumed without reading raw numbers.

**Acceptance Criteria:**

- [ ] An analytics page exists at `pages/documents/[id]/analytics.tsx`, accessible only to authenticated owners
- [ ] The page fetches document-level analytics via `GET /api/v1/documents/[id]/analytics`
- [ ] A line chart shows "Views per Day" for the last 30 days
- [ ] Summary stats are shown in card form: Total Views, Unique Viewers, Avg. Time on Page (formatted as "Xm Ys"), Avg. Pages Viewed
- [ ] A bar or table shows "Top Links" — up to 5 share links ranked by view count, with their labels
- [ ] Each link in the "Top Links" section is clickable, navigating to a per-link analytics drawer or modal that fetches `GET /api/v1/documents/[id]/links/[linkId]/analytics` and shows the same stats + chart for that specific link
- [ ] Empty state: "Nenhuma visualização ainda. Compartilhe um link para começar a rastrear."
- [ ] Loading skeleton while data is being fetched
- [ ] A navigation breadcrumb: Dashboard → [Document Title] → Analytics
- [ ] Unauthenticated users are redirected to `/login`

**Technical Context:**

- Relevant files:
  - `pages/documents/[id]/analytics.tsx` *(create)*
  - `components/analytics/ViewsChart.tsx` *(create — line chart for views_by_day)*
  - `components/analytics/StatCard.tsx` *(create — single metric display card)*
  - `components/analytics/TopLinksTable.tsx` *(create)*
  - `components/analytics/LinkAnalyticsDrawer.tsx` *(create — slide-in or modal for per-link stats)*
- For charting, use a lightweight library already evaluable via CDN or npm — consider `recharts` (React-native) or `chart.js` with `react-chartjs-2`. Add the chosen library to `package.json`.
- The `views_by_day` data from the API is an array of `{ date, count }` — map this directly to the chart's data format. The API guarantees all 30 days are present (with zero counts) so no date-filling is needed on the frontend.
- Format `avg_time_on_page` (seconds integer) as "Xm Ys" using a utility function in `lib/formatters.ts`
- Dependencies / considerations:
  - Requires US-03 and US-04 (analytics API endpoints) to be implemented
  - Requires US-06 (auth), US-09 (dashboard navigation)
  - The per-link analytics drawer re-uses the same chart and stat card components with different data
