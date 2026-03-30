Write integration tests for a Papershare API endpoint.

Endpoint to test: $ARGUMENTS

Steps:

1. Read the route handler in `pages/api/v1/` and the relevant model to understand all code paths.
2. Read `tests/orchestrator.ts` to see what helpers are available.
3. Create or update the test file in `tests/integration/api/v1/` mirroring the route path.
4. Cover these scenarios at minimum:
   - Happy path (correct inputs → expected status + body)
   - Missing required fields → 400 ValidationError
   - Resource not found → 404 NotFoundError
   - Unauthenticated request (if route is protected) → 401 UnathorizedError
   - Duplicate/conflict if applicable → 400 ValidationError
5. Each test file must start with:
   ```ts
   beforeAll(async () => {
     await orchestrator.waitForAllServices();
     await orchestrator.cleanDatabase();
     await orchestrator.runPendingMigrations();
   });
   ```
6. Use `orchestrator.createUser()` for fixtures. Never hardcode UUIDs.
7. Run `npm run sf` to fix formatting after writing tests.
