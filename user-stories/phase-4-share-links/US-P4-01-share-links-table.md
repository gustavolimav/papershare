# US-P4-01 — Share Links Table & Migration

---

**User Story: Share Links Table**

**As a** backend developer,
**I want to** create the `share_links` database table and TypeScript types,
**So that** the system can store configurable sharing links with optional passwords, expiry, and download restrictions.

**Acceptance Criteria:**

- [ ] A migration file `006-create-share-links.sql` exists in `infra/migrations/`
- [ ] The migration creates a `share_links` table with the following columns:
  - `id UUID PRIMARY KEY` — application-generated
  - `token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()` — the public-facing share token
  - `document_id UUID NOT NULL REFERENCES documents(id)`
  - `user_id UUID NOT NULL REFERENCES users(id)` — denormalized for fast ownership checks
  - `label VARCHAR(255)` — nullable; human-readable name for the link
  - `password_hash VARCHAR(255)` — nullable; bcrypt hash of the link password if set
  - `expires_at TIMESTAMPTZ` — nullable; after this timestamp the link is invalid
  - `allow_download BOOLEAN NOT NULL DEFAULT TRUE`
  - `is_active BOOLEAN NOT NULL DEFAULT TRUE` — set to FALSE to revoke without deleting
  - `created_at TIMESTAMPTZ DEFAULT timezone('utc', now())`
  - `updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())`
- [ ] TypeScript interfaces added to `types/index.ts`:
  - `ShareLink` — full DB row (includes `password_hash`)
  - `ShareLinkResponse` — omits `password_hash`, replaces with `has_password: boolean`
  - `ShareLinkCreateInput` — optional label, password, expires_at, allow_download
  - `ShareLinkUpdateInput` — same fields as create, all optional, at least one required
  - `ShareLinkWithDocument` — `ShareLinkResponse` extended with embedded `DocumentResponse` (used by public endpoint)
- [ ] Migration runs cleanly after migration 005 (documents table)
- [ ] An index on `document_id` for fast per-document link queries
- [ ] An index on `token` for fast public link lookups

**Technical Context:**

- Relevant files:
  - `infra/migrations/006-create-share-links.sql` *(create)*
  - `types/index.ts` *(add ShareLink interfaces)*
- The `token` is separate from `id` — `id` is used for owner-facing API operations (CRUD), while `token` is used for the public viewer URL (`/view/:token`). This means owners never expose the internal `id` in share URLs.
- `password_hash` must be omitted from all API responses; replace with a boolean `has_password` indicating whether a password is set
- Dependencies / considerations:
  - Must run after migration 005 (documents table)
  - `document_id` has no `ON DELETE CASCADE` — documents are soft-deleted, so links remain
