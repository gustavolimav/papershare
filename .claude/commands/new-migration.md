Create a new database migration for the Papershare project.

What the migration should do: $ARGUMENTS

Steps:

1. List files in `infra/migrations/` to find the next sequential number (e.g. if 003 exists, create 004).
2. Create `infra/migrations/NNN-description.sql` with the SQL.
3. Follow these conventions:
   - All tables use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Timestamps: `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
   - Soft deletes: `deleted_at TIMESTAMPTZ` (nullable)
   - Foreign keys: `user_id UUID NOT NULL REFERENCES users(id)`
   - Use `VARCHAR(N)` with explicit limits, not `TEXT`, unless the content is truly unbounded
4. If adding a new table, also add the corresponding TypeScript interface to `types/index.ts`.
5. Run `npm run migrations:up` (requires Docker running) to verify the migration applies cleanly.
6. Show the final SQL and explain each column decision.
