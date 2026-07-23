import crypto from "crypto";
import database from "infra/database";
import { TooManyRequestsError } from "infra/errors";
import { checkAndRecord } from "infra/rate-limit";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

// checkAndRecord is the Postgres-backed counting logic infra/rate-limit.ts's
// HTTP middleware wraps (which stays disabled outside NODE_ENV=production —
// otherwise every test file's repeated login/upload calls from the same
// "IP" would trip it). Testing the counting logic directly here still hits
// the real database, same as other model-level tests in this suite
// (e.g. tests/integration/api/v1/sessions/post.test.ts importing
// models/session directly).
describe("infra/rate-limit#checkAndRecord", () => {
  test("Allows requests under the limit, throws once the limit is reached", async () => {
    const key = `test:${crypto.randomUUID()}`;

    await checkAndRecord(key, 3, 60000);
    await checkAndRecord(key, 3, 60000);
    await checkAndRecord(key, 3, 60000);

    await expect(checkAndRecord(key, 3, 60000)).rejects.toThrow(
      TooManyRequestsError,
    );
  });

  test("Different keys are counted independently", async () => {
    const keyA = `test:${crypto.randomUUID()}`;
    const keyB = `test:${crypto.randomUUID()}`;

    await checkAndRecord(keyA, 1, 60000);
    await expect(checkAndRecord(keyA, 1, 60000)).rejects.toThrow(
      TooManyRequestsError,
    );

    // keyB's own first call still succeeds — the limit is per-key
    await checkAndRecord(keyB, 1, 60000);
  });

  test("A request outside the window no longer counts toward the limit", async () => {
    const key = `test:${crypto.randomUUID()}`;

    await checkAndRecord(key, 1, 60000);
    await expect(checkAndRecord(key, 1, 60000)).rejects.toThrow(
      TooManyRequestsError,
    );

    // Simulate the window having passed by backdating the row directly —
    // same technique the orchestrator uses elsewhere to test revisit
    // detection outside the dedup window.
    await database.query({
      text: "UPDATE rate_limit_log SET created_at = $1 WHERE key = $2",
      values: [new Date(Date.now() - 120000), key],
    });

    await checkAndRecord(key, 1, 60000);
  });
});
