# US-25 — Add `updated_at` Auto-Update Trigger

---

**User Story: `updated_at` Auto-Update Trigger**

**As a** developer querying Papershare data,
**I want** the `updated_at` column to be automatically updated by PostgreSQL whenever a row is modified,
**So that** application code doesn't need to manually set `updated_at = NOW()` in every UPDATE query, reducing the risk of stale timestamps.

**Acceptance Criteria:**

- [ ] A reusable PostgreSQL trigger function `set_updated_at()` is created via a migration that sets `NEW.updated_at = NOW()` on any row update
- [ ] The trigger is applied to all tables that have an `updated_at` column: `users`, `sessions`, `documents`, `share_links`
- [ ] All existing `UPDATE` queries in model files that explicitly set `updated_at = NOW()` are refactored to remove the manual update (the trigger handles it)
- [ ] A migration file `008-updated-at-trigger.sql` (or next available number) creates the trigger function and attaches it to all relevant tables
- [ ] The trigger uses `BEFORE UPDATE` timing so `updated_at` is set before the row is written
- [ ] Integration tests confirm that after a model update call, the `updated_at` timestamp on the row is more recent than `created_at`
- [ ] `npm test` passes after removing manual `updated_at` updates from model files

**Technical Context:**

- Relevant files:
  - `infra/migrations/008-updated-at-trigger.sql` *(create — or next available migration number)*
  - `models/user.ts` *(remove `updated_at = NOW()` from UPDATE queries)*
  - `models/session.ts` *(same)*
  - `models/document.ts` *(same)*
  - `models/shareLink.ts` *(same)*
- SQL for the trigger function:
  ```sql
  CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  -- Repeat for sessions, documents, share_links
  ```
- Dependencies / considerations:
  - The migration number must not conflict with US-01's migration 007 — coordinate numbering if multiple migrations are being added in parallel
  - This is a safe refactor — removing `updated_at = NOW()` from queries doesn't change visible behaviour since the trigger achieves the same result
  - Future tables (e.g., `link_views`) should have the trigger applied at creation time in their own migration
