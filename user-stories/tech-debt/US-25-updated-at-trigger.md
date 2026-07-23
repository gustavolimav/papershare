# US-25 — Add `updated_at` Auto-Update Trigger

---

**User Story: `updated_at` Auto-Update Trigger**

**As a** developer querying Papershare data,
**I want** the `updated_at` column to be automatically updated by PostgreSQL whenever a row is modified,
**So that** application code doesn't need to manually set `updated_at = NOW()` in every UPDATE query, reducing the risk of stale timestamps.

**Acceptance Criteria:**

- [x] A reusable PostgreSQL trigger function `set_updated_at()` is created via a migration that sets `NEW.updated_at = NOW()` on any row update
- [x] The trigger is applied to all tables that have an `updated_at` column — 9 by the time this was picked up, not the 4 originally scoped (see Resolution note): `users`, `sessions`, `documents`, `share_links`, `link_views`, `link_view_pages`, `workspaces`, `subscriptions`, `feature_flags`
- [x] All existing `UPDATE` queries in model files that explicitly set `updated_at = NOW()` are refactored to remove the manual update (the trigger handles it) — 13 occurrences across 8 files
- [x] A migration file `032-add-updated-at-trigger.sql` (next available number) creates the trigger function and attaches it to all relevant tables
- [x] The trigger uses `BEFORE UPDATE` timing so `updated_at` is set before the row is written
- [x] Integration tests confirm that after a model update call, the `updated_at` timestamp on the row is more recent than `created_at` — already covered by `tests/integration/api/v1/users/[username]/patch.test.ts`'s existing `updated_at > created_at` assertions, which exercise `models/user.ts#runUpdateQuery` (one of the 13 refactored spots); also manually verified directly against Postgres (see Resolution note)
- [x] `npm test` passes after removing manual `updated_at` updates from model files

**Technical Context:**

- Relevant files:
  - `infra/migrations/008-updated-at-trigger.sql` _(create — or next available migration number)_
  - `models/user.ts` _(remove `updated_at = NOW()` from UPDATE queries)_
  - `models/session.ts` _(same)_
  - `models/document.ts` _(same)_
  - `models/shareLink.ts` _(same)_
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

**Resolution (2026-07-22):** By the time this story was picked up, five
more tables had gained an `updated_at` column since it was written
(`link_views`, `link_view_pages`, `workspaces`, `subscriptions`,
`feature_flags` — `link_views` even already existed as an anticipated
future table per this story's own note above). Migration `032` attaches
the trigger to all 9. Tables confirmed to genuinely have no
`updated_at` column (correctly excluded): `workspace_members`,
`password_reset_tokens`, `document_chunks`, `ai_usage_log`,
`share_link_allowed_emails`.

Removed the manual `updated_at = NOW()`/`updated_at = timezone('utc',
now())` SET clause from all 13 places it appeared: `models/document.ts`,
`models/featureFlag.ts`, `models/subscription.ts` (×3),
`models/linkView.ts` (×2), `models/workspace.ts`, `models/shareLink.ts`
(×2), `models/user.ts` (×3).

**Bug caught by the existing test suite, not anticipated up front:**
`models/shareLink.ts#updateById` builds its `SET` clause dynamically —
one line per changed field — and used to unconditionally push
`updated_at = NOW()` onto that list, which incidentally guaranteed the
list was never empty. A request that only changes `allowed_emails`
(stored in a separate table, not part of this dynamic list) produced
zero real `SET` entries once that guaranteed entry was removed,
generating invalid SQL (`SET` with nothing after it) and a 503 —
caught immediately by `tests/integration/api/v1/documents/[id]/
links/[linkId]/index.test.ts`'s "clearing allowed_emails" test. Fixed
by skipping the `share_links` UPDATE entirely when no real column
changed, re-fetching via the existing `findLinkRow` instead — same
final response shape, no wasted no-op UPDATE.

Manually verified the trigger itself directly against Postgres
(`INSERT` a `feature_flags` row, wait, `UPDATE` a column with no
`updated_at` in the query, confirm `updated_at > created_at`) before
touching any application code.
