# US-19 — Replace `any` Types in DatabaseQuery

---

**User Story: Fix `any` Types in DatabaseQuery**

**As a** developer working on the Papershare codebase,
**I want** the `DatabaseQuery.values` type to be properly typed instead of `any[]`,
**So that** the TypeScript compiler catches type mismatches in query parameters at compile time rather than at runtime.

**Acceptance Criteria:**

- [ ] The `any` type in `DatabaseQuery.values` in `infra/database.ts` (and/or `types/index.ts`) is replaced with a union of valid PostgreSQL parameter types
- [ ] The replacement type covers all values currently passed as query params across the codebase: `string`, `number`, `boolean`, `Date`, `null`, `undefined`, and `Buffer` (for binary data)
- [ ] No new TypeScript errors are introduced by this change — all existing call sites remain valid
- [ ] `npm run lint:eslint:check` passes with no `@typescript-eslint/no-explicit-any` warnings related to query values
- [ ] The TypeScript compiler (`tsc --noEmit`) reports zero errors after the change
- [ ] A search of the codebase confirms no remaining `any` usages in query-related code

**Technical Context:**

- Relevant files:
  - `types/index.ts` *(update `DatabaseQuery` interface — `values` field)*
  - `infra/database.ts` *(update `query<T>()` function signature if the type is defined inline)*
- Current state: the `values` field in `DatabaseQuery` is typed as `any[]` (noted in the tech debt backlog). The fix is to define a type alias:
  ```ts
  export type QueryParam = string | number | boolean | Date | Buffer | null | undefined;
  ```
  and replace `any[]` with `QueryParam[]`.
- After changing, run `tsc --noEmit` to identify any call sites that were accidentally passing unsupported types. Fix those call sites rather than widening the type back to `any`.
- Dependencies / considerations:
  - Low-risk, isolated change — no runtime behaviour changes
  - May reveal latent bugs where objects or arrays were being accidentally passed as query params
  - Do this change in isolation before other PRs touch `infra/database.ts` to avoid merge conflicts
