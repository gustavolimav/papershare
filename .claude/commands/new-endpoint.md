Create a new API endpoint for the Papershare project following the project conventions in CLAUDE.md.

The endpoint to create: $ARGUMENTS

Steps to follow:

1. Read CLAUDE.md to recall architecture rules before writing anything.
2. If a new table is needed, create the migration file in `infra/migrations/` with the next sequential number.
3. Add any new TypeScript types/interfaces to `types/index.ts`.
4. Implement the model in `models/` with typed functions and raw SQL queries.
5. Create the page handler in `pages/api/v1/` using `createRouter` from `next-connect`. Apply `router.use(authMiddleware)` if the route requires authentication.
6. Write integration tests in `tests/integration/api/v1/` covering: happy path, validation errors, auth errors, not-found errors.
7. Run `npm run sf` to fix formatting.
8. Summarize what was created and what tests cover.
