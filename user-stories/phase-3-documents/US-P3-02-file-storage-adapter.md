# US-P3-02 — File Storage Adapter

---

**User Story: File Storage Adapter**

**As a** backend developer,
**I want** a pluggable file storage adapter that abstracts local filesystem storage,
**So that** files can be saved and deleted without the rest of the application knowing the storage implementation, making it easy to swap to S3/R2 later.

**Acceptance Criteria:**

- [ ] A `infra/storage.ts` module exists and exports `saveFile(file, originalFilename)` and `deleteFile(key)` functions
- [ ] `saveFile()` accepts a file buffer or stream and the original filename, saves the file to an `/uploads/` directory on the local filesystem, and returns `{ key: string, size: number }`
- [ ] The `key` returned by `saveFile()` is a UUID-based filename preserving the original file extension (e.g., `a1b2c3d4-....pdf`), ensuring uniqueness and preventing collisions
- [ ] `deleteFile(key)` attempts to delete the file from the filesystem; if the file is already gone (ENOENT), it silently succeeds
- [ ] In the test environment (`NODE_ENV === 'test'`), `saveFile()` is a no-op: it returns a valid `{ key, size }` without touching the filesystem, so tests don't accumulate files
- [ ] The `/uploads/` directory is created automatically if it does not exist on startup
- [ ] The adapter interface is defined so it can be swapped for an S3/R2 implementation by changing only `infra/storage.ts`

**Technical Context:**

- Relevant files:
  - `infra/storage.ts` *(create)*
- The function signature: `saveFile(file: Buffer | Readable, originalFilename: string): Promise<{ key: string, size: number }>`
- The key format: `crypto.randomUUID() + path.extname(originalFilename)` (e.g., `uuid.pdf`)
- In test mode: return `{ key: \`test-\${crypto.randomUUID()}.pdf\`, size: file.length || 0 }` without writing to disk
- `deleteFile` should use `fs.unlink()` wrapped in a try/catch that ignores `ENOENT`
- Dependencies / considerations:
  - No new npm packages needed — uses Node's built-in `fs`, `path`, `crypto`
  - The `/uploads/` path should be relative to the project root or configurable via `UPLOADS_DIR` env var
  - Future S3 adapter would implement the same `saveFile`/`deleteFile` interface using `@aws-sdk/client-s3`
