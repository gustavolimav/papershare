# US-26 — TypeScript Type-Check in GitHub Actions CI

---

**User Story: TypeScript CI Type-Check**

**As a** developer contributing to Papershare,
**I want** TypeScript type errors to be caught automatically in CI on every pull request,
**So that** type regressions are never merged to main without being noticed.

**Acceptance Criteria:**

- [ ] A GitHub Actions workflow step runs `tsc --noEmit` on every push to `main` and every pull request targeting `main`
- [ ] The CI step fails if `tsc --noEmit` reports any errors
- [ ] The workflow is added to the existing CI file (if one exists) or a new file `.github/workflows/ci.yml` is created
- [ ] The workflow uses the Node.js version specified in `package.json` or `.nvmrc` (if present)
- [ ] The workflow caches `node_modules` using `actions/cache` or `actions/setup-node`'s built-in cache to speed up runs
- [ ] All current TypeScript errors (if any) are fixed before merging this workflow, so the starting state is green
- [ ] The workflow name and job names are descriptive: `CI` workflow, `typecheck` job
- [ ] A `tsconfig.json` `strict` mode or at minimum `noImplicitAny` is enabled (confirm existing config — do not weaken it)

**Technical Context:**

- Relevant files:
  - `.github/workflows/ci.yml` *(create or update)*
  - `tsconfig.json` *(review — ensure `noEmit` is not set permanently in tsconfig, it belongs in the CI command)*
  - `package.json` *(optionally add a `"typecheck": "tsc --noEmit"` script)*
- Suggested workflow structure:
  ```yaml
  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version-file: '.nvmrc'
            cache: 'npm'
        - run: npm ci
        - run: npm run typecheck
  ```
- Adding a `"typecheck": "tsc --noEmit"` script to `package.json` also allows developers to run the check locally with `npm run typecheck`
- If US-19 (fix `any` types) has not been completed, fix those type errors as part of this story or do US-19 first
- Dependencies / considerations:
  - No runtime or API changes — pure CI/DX improvement
  - If a `.github/workflows/` directory already exists with a CI file, extend it rather than creating a duplicate
  - Consider adding a lint step (`npm run lint:eslint:check`) to the same workflow job for a comprehensive CI check
