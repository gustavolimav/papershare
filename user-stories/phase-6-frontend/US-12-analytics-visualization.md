# US-12 — Analytics Visualization Page

---

**User Story: Analytics Visualization**

**As a** document owner,
**I want to** see a visual analytics dashboard for a document showing views over time, viewer engagement, and per-link performance,
**So that** I can quickly grasp how my document is being consumed without reading raw numbers.

> **Alignment note (2026-07-13):** App Router: route is
> `app/documents/[id]/analytics/page.tsx`, Server Component gate via
> `getServerUser()` same as US-09/US-10. Chart library decided:
> **recharts** — it's the library shadcn/ui's own chart component
> wrapper is built on, so it fits this project's existing shadcn setup
> better than `chart.js`/`react-chartjs-2` (no separate styling system
> to reconcile). Add `recharts` to `package.json` when starting this
> story. The "drawer" for per-link analytics can use shadcn's `Dialog`
> (`components/ui/dialog.tsx`, already installed) — a real slide-in
> `Sheet`/`Drawer` component isn't installed yet; add it via
> `npx shadcn@latest add sheet` if a true drawer is wanted instead of a
> centered dialog.

**Acceptance Criteria:**

- [ ] An analytics page exists at `app/documents/[id]/analytics/page.tsx`, accessible only to authenticated owners
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
  - `app/documents/[id]/analytics/page.tsx` _(create)_
  - `components/analytics/ViewsChart.tsx` _(create — recharts `LineChart` for views_by_day)_
  - `components/analytics/StatCard.tsx` _(create — single metric display card, can build on `components/ui/card.tsx`)_
  - `components/analytics/TopLinksTable.tsx` _(create)_
  - `components/analytics/LinkAnalyticsDrawer.tsx` _(create — see alignment note above re: Dialog vs Sheet)_
- The `views_by_day` data from the API is an array of `{ date, count }` — map this directly to recharts' data format. The API guarantees all 30 days are present (with zero counts) so no date-filling is needed on the frontend.
- Format `avg_time_on_page` (seconds integer) as "Xm Ys" using a utility function in `lib/formatters.ts`
- Dependencies / considerations:
  - Requires US-03 and US-04 (analytics API endpoints) to be implemented
  - Requires US-06 (auth), US-09 (dashboard navigation)
  - The per-link analytics drawer re-uses the same chart and stat card components with different data
