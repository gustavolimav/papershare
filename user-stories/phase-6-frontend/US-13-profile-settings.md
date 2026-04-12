# US-13 — Account & Profile Settings Page

---

**User Story: Account & Profile Settings**

**As an** authenticated user,
**I want to** view and update my profile information and manage my account from a settings page,
**So that** I can keep my details current and control my account lifecycle.

**Acceptance Criteria:**

- [ ] A settings page exists at `pages/settings.tsx`, accessible only to authenticated users
- [ ] The page is divided into two sections: "Profile" and "Account"

**Profile section:**
- [ ] Displays current username and email
- [ ] An "Edit Profile" form allows updating username, email, and/or password
- [ ] Client-side validation mirrors backend rules (same as registration: username 3–30 chars, valid email, password 8+ chars)
- [ ] On submit, calls `PATCH /api/v1/users/[username]`
- [ ] On success, the `AuthContext` user is revalidated and a success toast/alert is shown: "Perfil atualizado com sucesso."
- [ ] Validation errors from the API are displayed inline

**Account section:**
- [ ] A "Log Out" button calls `DELETE /api/v1/sessions`, clears the auth context, and redirects to `/`
- [ ] A "Delete Account" button opens a confirmation dialog with a warning: "Esta ação é permanente e não pode ser desfeita."
- [ ] Confirming account deletion calls `DELETE /api/v1/users/[username]` and redirects to `/` after success
- [ ] Both the logout and delete-account actions show a loading state while in flight

**Technical Context:**

- Relevant files:
  - `pages/settings.tsx` *(create)*
  - `components/settings/ProfileForm.tsx` *(create)*
  - `components/settings/DangerZone.tsx` *(create — logout + delete account)*
  - `components/ui/Toast.tsx` *(create — success/error notification)*
- After a successful `PATCH`, call `AuthContext.mutateUser()` to re-fetch the session (the username may have changed, which affects the API path for future calls)
- After logout (`DELETE /api/v1/sessions`), call `AuthContext.mutateUser(null, false)` to immediately clear the user from the context before redirecting
- The `PATCH /api/v1/users/[username]` endpoint uses the current username in the URL path — if the user changes their username, use the username from the original session (before the update) as the path parameter
- Dependencies / considerations:
  - Requires US-06 (AuthContext), US-08 (shared UI components)
  - No backend changes needed — all required endpoints exist
  - The Delete Account endpoint soft-deletes the user and calls `session.deleteByUserId()` — after this completes, the session cookie is invalid; the frontend redirect ensures the user ends up on a public page
