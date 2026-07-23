# US-21 — Environment Variable Validation on Startup

---

**User Story: Environment Variable Validation on Startup**

**As a** developer deploying or running Papershare,
**I want** the application to fail fast with a clear error if required environment variables are missing or malformed,
**So that** I don't spend time debugging mysterious runtime failures caused by a missing config value.

**Acceptance Criteria:**

- [x] A new module `infra/env.ts` validates all required environment variables at application startup
- [x] The following variables are validated as required (non-empty strings): `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `PEPPER`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` (see Resolution note — `DATABASE_URL` moved to optional; it's not read by any app code today)
- [x] `NODE_ENV` is validated to be one of `development`, `production`, `test`
- [x] `POSTGRES_PORT` is validated to be a valid integer
- [x] If any required variable is missing or invalid, the process logs a clear error message listing ALL missing/invalid variables and exits with code 1
- [x] The validation runs once at startup, via a Next.js `instrumentation.ts` (Next.js 14 needs `experimental.instrumentationHook: true` in `next.config.mjs` for this to fire — stabilized by default in Next.js 15+)
- [x] Optional variables (`DATABASE_URL`, `ENCRYPTION_KEY`, `MIGRATIONS_SECRET`, `STORAGE_REGION`/`STORAGE_ENDPOINT`/`STORAGE_FORCE_PATH_STYLE`, `MAX_FILE_SIZE_MB`, `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, `STRIPE_*`) log a warning but do not cause a startup failure — see Resolution note (no `ANTHROPIC_API_KEY` exists in this codebase; it's a pure BYOK model, each user's own key lives in the DB, never an env var)
- [x] A `.env.example` file exists at the project root listing all variables with placeholder values and comments
- [x] `npm run dev` fails clearly (not silently) if required variables are missing

**Technical Context:**

- Relevant files:
  - `infra/env.ts` _(create)_
  - `.env.example` _(create if not already present)_
  - `pages/api/v1/status.ts` or `pages/_app.tsx` _(import `infra/env.ts` to trigger validation)_
- Recommended implementation: use Zod to define an env schema and parse `process.env` through it:
  ```ts
  import { z } from "zod";
  const envSchema = z.object({
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),
    // ...
  });
  export const env = envSchema.parse(process.env);
  ```
  This provides a typed `env` object that can be imported instead of using `process.env` directly.
- Next.js 14 supports `instrumentation.ts` at the root for server-side startup logic — this is the cleanest integration point
- Dependencies / considerations:
  - `zod` is already a dependency — no new packages needed
  - Once `infra/env.ts` exists, other modules (`infra/database.ts`, `infra/auth.ts`) can import `env` from it instead of accessing `process.env` directly — this is optional but improves type safety
  - Be careful not to import `infra/env.ts` in code paths that run during build time (next build) where env vars may not be set

**Resolution (2026-07-22):** Re-checked every variable against actual
runtime behavior rather than trusting the list above verbatim (written
before Phases 3–14 existed). Several already have graceful,
call-time-only fallbacks elsewhere in the codebase — crashing the whole
app for those at startup would contradict that existing design instead
of complementing it, so they moved to the optional/warn-only list:

- `DATABASE_URL` — not read by any app code (`infra/database.ts` builds
  the connection from the individual `POSTGRES_*` vars via `pg.Pool`,
  `models/migrator.ts` does the same via `database.getNewClient()`).
  Kept in `.env.example` for compatibility with future tooling, but
  isn't required.
- `ENCRYPTION_KEY` — `infra/encryption.ts#getKey()` already throws its
  own friendly `ServiceError` only when a caller actually tries to
  encrypt/decrypt, not at import time.
- `MIGRATIONS_SECRET` — `infra/auth.ts#migrationsAuthMiddleware` already
  treats a missing secret as "header check disabled," falling through
  to the superadmin-session check.
- `STRIPE_*`, `RESEND_API_KEY`, `MAIL_FROM_ADDRESS` — already documented
  in `CLAUDE.md` as degrade-gracefully-when-unset.

Added `STORAGE_BUCKET`/`STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`
to the _required_ list instead (not in the original story) — uploads
are core product functionality with no graceful degradation path today
(`infra/storage.ts` would surface an opaque S3 auth error on first use
instead of a clear one at boot).
