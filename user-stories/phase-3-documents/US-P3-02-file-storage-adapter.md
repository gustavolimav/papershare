# US-P3-02 — File Storage Adapter

---

**User Story: File Storage Adapter**

**As a** backend developer,
**I want** a pluggable file storage adapter backed by an S3-compatible object store,
**So that** files can be saved and deleted without the rest of the application knowing the storage implementation, and the same code path works identically in local dev (MinIO) and production (AWS S3 or Cloudflare R2).

> **Decision (2026-07-12):** local filesystem storage was considered but rejected — it doesn't survive
> serverless/ephemeral deploy targets (e.g. Vercel Preview Deployments have a read-only, throwaway
> filesystem), so "swap it for S3 later" would mean real rework in Phase 6. Going S3-compatible from
> the start costs the same amount of code (one adapter, one interface) and removes that rework.
> MinIO runs locally via Docker Compose as a drop-in S3-compatible target for dev and tests.

**Acceptance Criteria:**

- [ ] A `infra/storage.ts` module exists and exports `saveFile(file, originalFilename)` and `deleteFile(key)` functions
- [ ] `saveFile()` accepts a file buffer and the original filename, uploads it to the configured S3-compatible bucket, and returns `{ key: string, size: number }`
- [ ] The `key` returned by `saveFile()` is a UUID-based object key preserving the original file extension (e.g., `a1b2c3d4-....pdf`), ensuring uniqueness and preventing collisions
- [ ] `deleteFile(key)` deletes the object from the bucket; if the object is already gone, it silently succeeds (S3 `DeleteObject` is idempotent by design, no error handling needed for "not found")
- [ ] In the test environment (`NODE_ENV === 'test'`), `saveFile()` is a no-op: it returns a valid `{ key, size }` without calling S3, so tests don't need network access or a real bucket
- [ ] The bucket is created automatically on first use if it does not exist (`CreateBucketCommand`, ignoring `BucketAlreadyOwnedByYou`)
- [ ] The adapter works unchanged against MinIO (local), AWS S3, or Cloudflare R2 — only env vars change between environments

**Technical Context:**

- Relevant files:
  - `infra/storage.ts` *(create)*
  - `infra/compose.yaml` *(add `storage` MinIO service)*
  - `.env.development` *(add `STORAGE_*` vars)*
- The function signature: `saveFile(file: Buffer, originalFilename: string): Promise<{ key: string, size: number }>`
- The key format: `crypto.randomUUID() + path.extname(originalFilename)` (e.g., `uuid.pdf`)
- In test mode: return `{ key: \`test-\${crypto.randomUUID()}.pdf\`, size: file.length }` without calling S3
- Uses `@aws-sdk/client-s3` (`S3Client`, `PutObjectCommand`, `DeleteObjectCommand`, `CreateBucketCommand`, `HeadBucketCommand`)
- `S3Client` config reads `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, and sets `forcePathStyle: true` when `STORAGE_FORCE_PATH_STYLE=true` (required by MinIO; must be unset/false against real AWS S3)
- Dependencies / considerations:
  - `@aws-sdk/client-s3` must be added to `package.json`
  - Future R2/production config only changes `STORAGE_ENDPOINT` (R2's account-specific endpoint) and unsets `STORAGE_FORCE_PATH_STYLE` — no code change
