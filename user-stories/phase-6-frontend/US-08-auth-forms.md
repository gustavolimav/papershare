# US-08 — Registration & Login Forms

---

**User Story: Registration & Login Forms**

**As a** new or returning user,
**I want to** register for an account and log in through a web form,
**So that** I can access Papershare without using the API directly.

**Acceptance Criteria:**

**Registration (`/register`):**
- [ ] A registration page exists at `pages/register.tsx`
- [ ] The form collects: username, email, password (with a confirmation field)
- [ ] Client-side validation mirrors backend rules: username 3–30 chars alphanumeric, email valid format, password 8+ chars, passwords match
- [ ] On submit, the form calls `POST /api/v1/users`
- [ ] On success (201), the user is automatically logged in (session created via `POST /api/v1/sessions`) and redirected to `/dashboard`
- [ ] On failure, the API error message is displayed inline below the relevant field (or as a form-level error)
- [ ] Already authenticated users are redirected to `/dashboard`
- [ ] A link to `/login` is shown for users who already have an account

**Login (`/login`):**
- [ ] A login page exists at `pages/login.tsx`
- [ ] The form collects: email, password
- [ ] On submit, the form calls `POST /api/v1/sessions`
- [ ] On success (201), the `AuthContext` user is revalidated and the user is redirected to `/dashboard`
- [ ] On failure (401), the error message "E-mail ou senha inválidos." is displayed
- [ ] Rate-limit errors (429) display a user-friendly message: "Muitas tentativas. Aguarde um momento."
- [ ] Already authenticated users are redirected to `/dashboard`
- [ ] A link to `/register` is shown for new users
- [ ] Password field has a show/hide toggle

**Both forms:**
- [ ] Loading state (spinner or disabled button) while the request is in flight
- [ ] Forms are accessible: labels associated with inputs, ARIA attributes on error messages
- [ ] Forms are responsive

**Technical Context:**

- Relevant files:
  - `pages/register.tsx` *(create)*
  - `pages/login.tsx` *(create)*
  - `components/forms/RegisterForm.tsx` *(create)*
  - `components/forms/LoginForm.tsx` *(create)*
  - `components/ui/Button.tsx` *(create — reusable button component)*
  - `components/ui/Input.tsx` *(create — reusable input with label + error state)*
- Use React `useState` for form state (no external form library required for this scope)
- The `AuthContext.mutateUser()` method from US-06 should be called after a successful login so SWR re-fetches the session
- Error message language: user-facing messages in Portuguese (pt-BR) per project convention
- Dependencies / considerations:
  - Requires US-06 (AuthContext)
  - No backend changes — all required endpoints (`POST /api/v1/users`, `POST /api/v1/sessions`) already exist
