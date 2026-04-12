# US-21 — Environment Variable Validation on Startup

---

**User Story: Environment Variable Validation on Startup**

**As a** developer deploying or running Papershare,
**I want** the application to fail fast with a clear error if required environment variables are missing or malformed,
**So that** I don't spend time debugging mysterious runtime failures caused by a missing config value.

**Acceptance Criteria:**

- [ ] A new module `infra/env.ts` validates all required environment variables at application startup
- [ ] The following variables are validated as required (non-empty strings): `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `PEPPER`
- [ ] `NODE_ENV` is validated to be one of `development`, `production`, `test`
- [ ] `POSTGRES_PORT` is validated to be a valid integer
- [ ] If any required variable is missing or invalid, the process logs a clear error message listing ALL missing/invalid variables and exits with code 1
- [ ] The validation runs once at startup (imported at the top of `pages/_app.tsx` server-side, or in a Next.js `instrumentation.ts` if using Next.js 14's instrumentation hook)
- [ ] Optional variables (`ANTHROPIC_API_KEY`, `MAX_FILE_SIZE_MB`) log a warning but do not cause a startup failure
- [ ] A `.env.example` file exists at the project root listing all variables with placeholder values and comments
- [ ] `npm run dev` fails clearly (not silently) if `.env.local` is missing required variables

**Technical Context:**

- Relevant files:
  - `infra/env.ts` *(create)*
  - `.env.example` *(create if not already present)*
  - `pages/api/v1/status.ts` or `pages/_app.tsx` *(import `infra/env.ts` to trigger validation)*
- Recommended implementation: use Zod to define an env schema and parse `process.env` through it:
  ```ts
  import { z } from 'zod';
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
