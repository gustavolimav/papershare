# US-42 — Auth Pages Restyle

---

**User Story: Login & Register Restyle**

**As a** visitor signing up or logging in,
**I want** the auth pages to match the rest of the product's new visual identity,
**So that** the first real interaction with the product feels consistent with the marketing site.

**Acceptance Criteria:**

- [ ] `app/login/page.tsx`, `app/register/page.tsx`: restyle the centered
      card to the prototype's look — wordmark above the card, serif
      "Bem-vindo de volta" / equivalent heading, muted subtext, styled
      inputs, primary submit button. No layout restructuring beyond
      styling — same fields, same validation, same submit behavior.
  - Explicitly **no** "Continuar com o Google" button — the prototype shows one, but real Google OAuth is out of scope for this phase (confirmed with the user; see design doc's Key Decisions).
- [ ] `components/forms/LoginForm.tsx`, `components/forms/RegisterForm.tsx`: restyle inputs/buttons/error text to the new tokens — no change to field names, validation logic, or submit handlers.
- [ ] `app/forgot-password/page.tsx`, `app/reset-password/[token]/page.tsx` and their forms (`ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`) restyled the same way, for visual consistency with `/login` — same card treatment, same input/button styling. No behavior change.
- [ ] Public `Header`/`Footer` on these pages inherit whatever US-41 already restyled (if US-41 has landed on the shared base by the time this runs) or use the same design-doc tokens directly otherwise — either way, don't re-restyle `Header.tsx`/`Footer.tsx` again if US-41 already did.
- [ ] Manual browser verification: `/login`, `/register`, `/forgot-password`, `/reset-password/[token]` in both light and dark mode; submit a real login to confirm no behavior regression.

**Technical Context:**

- Relevant files:
  - `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/[token]/page.tsx` _(modify)_
  - `components/forms/LoginForm.tsx`, `components/forms/RegisterForm.tsx`, `components/forms/ForgotPasswordForm.tsx`, `components/forms/ResetPasswordForm.tsx` _(modify — styling only)_
- Depends on: US-40 (tokens/fonts from US-39, and confirms `Header.tsx`'s authenticated branch is already gone).
- Runs independently of US-41 (different files), but if both land on top of US-40 without one merged first, whoever merges second gets a trivial `Header.tsx`/`Footer.tsx` styling conflict to reconcile (same class as prior stacked-PR conflicts in this repo) — not a logic conflict.
