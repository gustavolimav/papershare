# US-37 — Frontend: Faturamento Tab & Usage-Aware UI

---

**User Story: Frontend Billing & Usage-Aware UI**

**As a** workspace owner,
**I want** to see my plan, my usage against Free-tier limits, and a clear way to upgrade — right where I'd hit a wall,
**So that** I'm never surprised by a `402` I couldn't have predicted from the UI.

**Acceptance Criteria:**

- [ ] New "Faturamento" tab in `/settings`, same insertion pattern as the existing "IA"/"Equipe" tabs (`components/billing/BillingSettingsForm.tsx`). Reads the active workspace via `useWorkspaces()` (already returns `plan`/`document_count`/`active_link_count` per US-36, no new fetch).
  - Shows the current plan name (`Free`/`Pro`/`Business`).
  - On Free: a usage line, e.g. "7 de 10 documentos · 3 de 10 links ativos".
  - Owner-only: if `plan === "free"`, two buttons — "Assinar Pro" and "Assinar Business" — each `POST`s `/api/v1/workspaces/[id]/billing/checkout` with the corresponding plan and redirects the browser to the returned `url`. If `plan !== "free"`, a single "Gerenciar assinatura" button that `POST`s `.../billing/portal` and redirects.
  - Non-owner (editor/viewer): the same plan/usage info, no buttons — mirrors `TeamSettingsForm.tsx`'s existing owner-gating pattern from US-33.
- [ ] `app/settings/page.tsx`: insert the "Faturamento" section between "Equipe" and "Conta", matching the existing section order/pattern.
- [ ] On return from Stripe Checkout with `?checkout=success` in the URL (`useSearchParams()`), show a success toast and call `mutate(WORKSPACES_KEY)` so the new plan reflects immediately without a manual refresh; on `?checkout=canceled`, no toast, just clean the query param.
- [ ] `components/documents/DocumentList.tsx`: alongside the existing `canEdit` role check gating the upload zone, add a limit check — when `activeWorkspace.plan === "free"` and `document_count >= 10`, replace the `UploadZone` with an inline message ("Limite de 10 documentos do plano Free atingido. Faça upgrade em Configurações → Faturamento.") instead of hiding it silently or letting the user hit a raw 402.
- [ ] `components/share-links/ShareLinkList.tsx`: same shape — when at the Free active-link cap, the "Criar novo link" trigger is replaced with the same style of inline upgrade message instead of opening a modal that will just fail on submit.
- [ ] `CreateShareLinkModal.tsx`/`EditShareLinkModal.tsx`: the watermark `Switch`, NDA `Textarea`, allow-list `Textarea`, and branding `Input`/`Textarea` fields render `disabled` with a small inline hint ("Recurso do plano Pro") when the active workspace is on Free, rather than accepting input that fails on submit.
- [ ] A `402` response anywhere in the app (caught by the existing generic fetch-error handling, or added where missing) surfaces the error's `message`/`action` from `PaymentRequiredError` in a toast, as a fallback for any gated action not explicitly covered above.
- [ ] Manual browser verification: a Free-plan workspace shows the usage line and disabled feature fields correctly; clicking "Assinar Pro" redirects to a real Stripe Checkout page (use Stripe's test mode + test card); completing checkout redirects back with the plan updated and visible without a manual reload; a non-owner member sees the read-only Faturamento view with no buttons.

**Technical Context:**

- Relevant files:
  - `components/billing/BillingSettingsForm.tsx` _(create)_
  - `app/settings/page.tsx` _(modify — insert "Faturamento" section)_
  - `components/documents/DocumentList.tsx` _(modify — limit check alongside existing `canEdit`)_
  - `components/share-links/ShareLinkList.tsx` _(modify — same)_
  - `components/share-links/CreateShareLinkModal.tsx` / `EditShareLinkModal.tsx` _(modify — disable gated fields)_
  - `lib/useWorkspaces.ts` _(no change needed — already re-exports whatever `WorkspaceWithRole` carries)_
- Depends on: US-35 (checkout/portal endpoints), US-36 (`plan`/`document_count`/`active_link_count` on `WorkspaceWithRole`, and the `402` responses this story surfaces instead of ignoring).
- Reuses the exact `canEdit`-style gating pattern introduced when fixing the workspace-switcher dropdown bug during US-33's rollout (see `CHANGELOG.md`) — this story is the same principle (match the UI to what the API allows) applied to plan limits instead of roles.
