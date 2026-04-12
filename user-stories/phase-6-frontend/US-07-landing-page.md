# US-07 — Landing Page

---

**User Story: Landing Page**

**As a** prospective user visiting Papershare for the first time,
**I want to** see a clear, informative landing page,
**So that** I understand what the product does and am prompted to sign up or log in.

**Acceptance Criteria:**

- [ ] A landing page exists at route `/` (`pages/index.tsx`)
- [ ] The page renders a hero section with: product name ("Papershare"), a one-line value proposition, and a primary CTA button ("Get Started" → `/register`) and secondary CTA ("Log In" → `/login`)
- [ ] The page includes a features section summarising the three core capabilities: Upload Documents, Share with Links, Track Analytics
- [ ] If the user is already authenticated (session exists), they are redirected to `/dashboard` instead of seeing the landing page
- [ ] The page is fully responsive (mobile and desktop)
- [ ] The page uses only plain CSS modules or Tailwind (whichever is already configured in the project) — no additional CSS-in-JS libraries
- [ ] The page renders correctly with JavaScript disabled (Next.js SSR)
- [ ] No broken links on the page

**Technical Context:**

- Relevant files:
  - `pages/index.tsx` *(create)*
  - `styles/Home.module.css` *(create if using CSS modules)*
  - `components/layout/Header.tsx` *(create — shared nav header used across pages)*
  - `components/layout/Footer.tsx` *(create — minimal footer with copyright)*
- The auth redirect should use `useAuth()` from US-06 and Next.js `useRouter().replace('/dashboard')` once `isLoading` is false and `user` is non-null
- Dependencies / considerations:
  - Requires US-06 (AuthContext) to be in place for redirect logic
  - No backend changes needed
  - Keep the page lightweight — this is a marketing/entry page, not a dashboard
