# Papershare — Claude Code Context

## What this project is

Papershare is an open-source platform for document upload, sharing, and analytics.
Users upload documents, generate configurable sharing links, and see engagement data.
Stack: Next.js 14, TypeScript, PostgreSQL (raw SQL, no ORM), Jest integration tests.

---

## Architecture

```
pages/api/v1/   → HTTP delivery layer (route handlers, no business logic)
models/         → Domain/business logic (pure functions, no HTTP knowledge)
infra/          → Technical plumbing (DB client, error classes, middleware)
types/index.ts  → Single source of truth for all TypeScript interfaces
tests/          → Integration tests only (hit the live server + real DB)
```

**Rule:** business logic lives in `models/`, never in `pages/` or `infra/`.

---

## Database

- Raw SQL. No ORM. Use `database.query<T>({ text, values })` from `infra/database.ts`.
- Migrations are `.sql` files in `infra/migrations/`, run via `postgres-migrations`.
- Naming: `NNN-description.sql` (e.g. `004-create-documents.sql`).
- Always use parameterized queries (`$1`, `$2`, …). Never interpolate user input.
- Case-insensitive lookups: wrap column in `LOWER()` and pass `value.toLowerCase()`.

---

## Authentication

- Session-based (not JWT). Sessions stored in `sessions` table.
- `session_id` HTTP-only cookie holds the session token.
- Protect routes with `router.use(authMiddleware)` from `infra/auth.ts`.
- Authenticated request: cast to `AuthenticatedNextApiRequest` to access `req.user` and `req.session`.

---

## Error handling

Use the custom classes from `infra/errors.ts`. Never throw plain `Error` objects.

| Situation                              | Class                       |
| -------------------------------------- | --------------------------- |
| Invalid input / missing required field | `ValidationError` (400)     |
| Not authenticated                      | `UnathorizedError` (401)    |
| Resource not found                     | `NotFoundError` (404)       |
| DB / external service down             | `ServiceError` (503)        |
| Unexpected crash                       | `InternalServerError` (500) |

---

## Adding a new endpoint — checklist

1. Create migration if new table needed (`infra/migrations/NNN-*.sql`)
2. Add TypeScript types to `types/index.ts`
3. Implement model in `models/` (business logic + DB queries)
4. Create page handler in `pages/api/v1/` using `createRouter` from `next-connect`
5. Apply `router.use(authMiddleware)` if authentication required
6. Write integration tests in `tests/integration/api/v1/`

---

## Testing

- All tests are integration tests. They hit `http://localhost:3000` and a real PostgreSQL DB.
- Each test file starts with:
  ```ts
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.cleanDatabase();
    await orchestrator.runPendingMigrations();
  });
  ```
- Use `orchestrator.createUser()` for test fixtures. Never hardcode UUIDs or passwords.
- Tests run with Docker + Next.js dev server. Start both before running: `npm test`.

---

## Key commands

```bash
npm run dev              # Start Docker + run migrations + start Next.js
npm test                 # Run full integration test suite
npm run test:watch       # Watch mode
npm run sf               # Auto-fix formatting (Prettier + ESLint)
npm run lint:eslint:check # ESLint without fixing
npm run migrations:up    # Run pending migrations manually
npm run commit           # Interactive conventional commit (Commitizen)
```

---

## Code conventions

- Async/await everywhere. No `.then()` chains.
- Named exports for functions, default export for the model object.
- Model files export a single typed object: `export default modelName`.
- SQL: keywords uppercase, columns lowercase, one clause per line, trailing semicolon.
- No `console.log` in production code (use errors instead).
- Error messages in Portuguese (pt-BR). Internal/debug messages in English.
- Commits follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

---

## Environment variables

| Variable            | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `POSTGRES_HOST`     | DB host                                        |
| `POSTGRES_PORT`     | DB port                                        |
| `POSTGRES_USER`     | DB user                                        |
| `POSTGRES_DB`       | DB name                                        |
| `POSTGRES_PASSWORD` | DB password                                    |
| `DATABASE_URL`      | Full connection string                         |
| `PEPPER`            | Password hashing pepper (never change in prod) |
| `NODE_ENV`          | `development` / `production` / `test`          |

---

## Current state (as of 2026-03-30)

Completed: user registration, login, session auth middleware, profile get/update.
Next up: logout endpoint, authorization guard (own-resource check), documents upload.
See `TODO.md` for the full phased roadmap.
