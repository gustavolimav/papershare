# US-20 — Standardize Error Messages (pt-BR)

---

**User Story: Standardize Error Messages to pt-BR**

**As a** developer maintaining the Papershare codebase,
**I want** all user-facing error messages to be consistently in Portuguese (pt-BR),
**So that** the product presents a coherent language experience and the codebase convention is unambiguously enforced.

**Acceptance Criteria:**

- [ ] A full audit of all user-facing error messages across `models/`, `infra/`, and `pages/` is completed
- [ ] Every error message passed to a custom error class (e.g., `new ValidationError("...")`, `new NotFoundError("...")`) that is returned to API consumers is written in Portuguese (pt-BR)
- [ ] Internal/developer-facing error messages (e.g., console.error calls, `InternalServerError` stack traces) remain in English
- [ ] A clear comment convention is established: `// user-facing: pt-BR` near error messages and `// internal: EN` near debug messages — or these are documented in `CLAUDE.md`
- [ ] All existing integration tests that assert on error message text are updated if any messages changed
- [ ] `npm test` passes after the changes
- [ ] `CLAUDE.md` is updated (or confirmed already correct) to reflect the language convention

**Technical Context:**

- Relevant files to audit:
  - `models/user.ts`
  - `models/session.ts`
  - `models/document.ts`
  - `models/shareLink.ts`
  - `models/authentication.ts`
  - `infra/auth.ts`
  - `infra/schemas.ts` *(Zod error messages)*
  - `infra/rate-limit.ts`
  - `pages/api/v1/**/*.ts`
- Known mixed-language areas: `infra/schemas.ts` has Zod validation messages some of which may be in English; `infra/auth.ts` error messages on session expiry/missing cookie
- The `action` field of custom errors (the suggestion to the user about what to do) should also be in pt-BR — e.g., `action: "Verifique o formato do e-mail e tente novamente."`
- Dependencies / considerations:
  - Risk: integration tests that assert `.body.message` or `.body.action` will need updating if messages change — run the full test suite (`npm test`) after each file change
  - Scope: only user-facing messages returned in API responses — not internal logs, comments, or documentation
