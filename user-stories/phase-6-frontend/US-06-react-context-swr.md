# US-06 — React Context + SWR Client State Foundation

---

**User Story: React Context + SWR Foundation**

**As a** frontend developer building the Papershare UI,
**I want** a shared client-state layer using React Context and SWR,
**So that** all pages have a consistent, cached, and reactive way to access authenticated user data and API resources without prop-drilling.

**Acceptance Criteria:**

- [ ] An `AuthContext` is created that exposes:
  - `user` — current authenticated user object (`User | null`)
  - `isLoading` — boolean while session is being resolved
  - `mutateUser` — function to manually revalidate the user session
- [ ] A `useAuth()` hook is exported that reads from `AuthContext`
- [ ] The `AuthProvider` wraps the app in `pages/_app.tsx`, fetching the current session from `GET /api/v1/sessions` (or an appropriate session-status endpoint) on mount using SWR
- [ ] If the session is not found (401), `user` is set to `null`
- [ ] SWR is configured globally with sensible defaults: `revalidateOnFocus: true`, `dedupingInterval: 5000`
- [ ] A shared `fetcher` utility exists (e.g., `lib/fetcher.ts`) that wraps `fetch`, checks for non-2xx status, and throws an error with the API error body for SWR error handling
- [ ] All existing pages continue to work (no regressions)
- [ ] `swr` package is added to `package.json`

**Technical Context:**

- Relevant files:
  - `context/AuthContext.tsx` *(create)*
  - `lib/fetcher.ts` *(create)*
  - `pages/_app.tsx` *(create or update to wrap with `AuthProvider`)*
  - `package.json` *(add `swr`)*
- The existing API already returns user data from `GET /api/v1/users/[username]`, but a cleaner approach for the auth context is a dedicated `GET /api/v1/sessions` endpoint that returns the current session's user. Check if this endpoint already exists; if not, add it as a thin handler that reads `req.user` via `authMiddleware` and returns the user (without password).
- Pattern for SWR usage in components: `const { data: user, error, isLoading } = useSWR('/api/v1/sessions/me', fetcher)`
- Dependencies / considerations:
  - This story is a prerequisite for all other Phase 6 frontend stories
  - The `User` type exported from `types/index.ts` includes `password` — create a `PublicUser` type (or use the existing one if present) that omits the password field for client-side use
  - No UI components are built in this story — it is infrastructure only
