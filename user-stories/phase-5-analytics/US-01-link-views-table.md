# US-01 — Link Views Table & Migration

---

**User Story: Link Views Table**

**As a** backend developer maintaining the Papershare data model,
**I want to** create the `link_views` database table and corresponding TypeScript types,
**So that** the system has a persistent store for tracking every document view event, enabling analytics queries in subsequent stories.

**Acceptance Criteria:**

- [ ] A new migration file `007-create-link-views.sql` exists in `infra/migrations/`
- [ ] The migration creates a `link_views` table with the following columns:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `share_link_id UUID NOT NULL REFERENCES share_links(id)`
  - `viewer_fingerprint VARCHAR(64)` — browser fingerprint hash (nullable for anonymous)
  - `ip_address INET` — viewer IP address (nullable)
  - `country_code CHAR(2)` — ISO 3166-1 alpha-2 country code (nullable)
  - `user_agent TEXT` — raw User-Agent header (nullable)
  - `time_on_page INTEGER` — seconds spent on page (nullable, recorded on exit/heartbeat)
  - `pages_viewed INTEGER` — number of document pages scrolled into view (nullable)
  - `created_at TIMESTAMPTZ DEFAULT timezone('utc', now())`
- [ ] TypeScript interfaces added to `types/index.ts`:
  - `LinkView` — full DB row shape
  - `LinkViewCreateInput` — input for recording a view event
  - `LinkViewAnalytics` — aggregated analytics shape (used by later endpoints)
- [ ] Migration runs cleanly via `npm run migrations:up` with no errors
- [ ] Migration is idempotent (can be run on a clean DB with the full migration set)
- [ ] An index is created on `share_link_id` for fast analytics lookups
- [ ] An index is created on `created_at` for time-range queries

**Technical Context:**

- Relevant files:
  - `infra/migrations/007-create-link-views.sql` *(create)*
  - `types/index.ts` *(add `LinkView`, `LinkViewCreateInput`, `LinkViewAnalytics`)*
- Migration naming convention: `NNN-description.sql` — use `007-create-link-views.sql`
- Follow the same pattern as `005-create-documents.sql` and `006-create-share-links.sql` for column defaults and timezone handling (`timezone('utc', now())`)
- The `share_links` table already exists (migration 006). `share_link_id` must reference it with `ON DELETE CASCADE` so that revoking a link also cleans up its view history
- No model or API changes in this story — pure schema + types only
- Dependencies / considerations:
  - Must run after migration 006 (share_links table must exist)
  - `viewer_fingerprint` should be stored as a hash (e.g., SHA-256 of browser signals), not raw PII — keep column size at 64 chars
  - Country resolution is deferred to the view-recording endpoint (US-02); this migration only provides the column
