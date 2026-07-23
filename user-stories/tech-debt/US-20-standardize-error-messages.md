# US-20 — Standardize Error Messages (pt-BR)

---

**User Story: Standardize Error Messages to pt-BR**

**As a** developer maintaining the Papershare codebase,
**I want** all user-facing error messages to be consistently in Portuguese (pt-BR),
**So that** the product presents a coherent language experience and the codebase convention is unambiguously enforced.

**Acceptance Criteria:**

- [x] A full audit of all user-facing error messages across `models/`, `infra/`, and `pages/` is completed
- [x] Every error message passed to a custom error class (e.g., `new ValidationError("...")`, `new NotFoundError("...")`) that is returned to API consumers is written in Portuguese (pt-BR)
- [x] Internal/developer-facing error messages (e.g., console.error calls, `InternalServerError` stack traces) remain in English
- [x] A clear comment convention is established: `// user-facing: pt-BR` near error messages and `// internal: EN` near debug messages — or these are documented in `CLAUDE.md`
- [x] All existing integration tests that assert on error message text are updated if any messages changed
- [x] `npm test` passes after the changes
- [x] `CLAUDE.md` is updated (or confirmed already correct) to reflect the language convention

**Technical Context:**

- Relevant files to audit:
  - `models/user.ts`
  - `models/session.ts`
  - `models/document.ts`
  - `models/shareLink.ts`
  - `models/authentication.ts`
  - `infra/auth.ts`
  - `infra/schemas.ts` _(Zod error messages)_
  - `infra/rate-limit.ts`
  - `pages/api/v1/**/*.ts`
- Known mixed-language areas: `infra/schemas.ts` has Zod validation messages some of which may be in English; `infra/auth.ts` error messages on session expiry/missing cookie
- The `action` field of custom errors (the suggestion to the user about what to do) should also be in pt-BR — e.g., `action: "Verifique o formato do e-mail e tente novamente."`
- Dependencies / considerations:
  - Risk: integration tests that assert `.body.message` or `.body.action` will need updating if messages change — run the full test suite (`npm test`) after each file change
  - Scope: only user-facing messages returned in API responses — not internal logs, comments, or documentation

**Resolution (2026-07-22):** The codebase had already drifted to
near-full compliance by the time this story was picked up (a lot of
Phase 3–14 work landed after this story was written, all in pt-BR from
the start) — a full grep across every `new ValidationError`/
`NotFoundError`/`UnauthorizedError`/`ForbiddenError`/`ServiceError`/
`PaymentRequiredError` call site and every Zod schema message in
`infra/schemas.ts` found only four real English strings, all in
`infra/errors.ts`'s class _defaults_ (the fallback used when a caller
doesn't pass an explicit `message`/`action`) and one in
`infra/database.ts`:

- `ValidationError`'s default message/action — currently unreachable
  (every call site passes explicit text) but fixed anyway so the
  fallback doesn't silently reintroduce English if a future call site
  omits it.
- `MethodNotAllowedError`'s message/action — **reachable**: thrown by
  `infra/controller.ts`'s `onNoMatch` handler whenever a route is hit
  with an unsupported HTTP method, so this English text really was
  reaching API consumers. Updated 5 integration tests
  (`migrations/{put,delete}.test.ts`, `status/{post,put,delete}.test.ts`)
  that asserted the old English text.
- `infra/database.ts`'s `ServiceError` message ("Error connecting to
  the database") — **reachable**: returned to the client on any DB
  connection/query failure.
- Also fixed, while already in the file: `NotFoundError`'s default
  `action` had a pre-existing typo ("Verfique"/"parametros" missing
  their accents), unrelated to the language audit but the same line.

`CLAUDE.md`'s existing "Error messages in Portuguese (pt-BR).
Internal/debug messages in English." line already states the
convention correctly — no change needed there.
