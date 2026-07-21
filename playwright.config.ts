import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Loaded here (main process, before workers spawn) so DB env vars are
// inherited by every worker — same reasoning as jest.config.js's dotenv
// call, since tests/e2e/helpers.ts talks to Postgres directly via
// tests/orchestrator.ts (bypassing Stripe/UI for setup), not just HTTP.
dotenv.config({ path: ".env.development" });

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  // next dev occasionally serves a corrupted chunk under rapid automated
  // navigation (a known class of dev-mode HMR/compilation race, unrelated
  // to application code — manifests as a page-crashing SyntaxError with no
  // stack), on top of the usual hydration-timing slack a production build
  // wouldn't have. Two retries absorb both without masking a real,
  // reproducible failure (which fails identically on every retry too).
  retries: 2,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
