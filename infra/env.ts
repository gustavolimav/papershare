import { z } from "zod";

// Only variables with no graceful runtime fallback belong here — Postgres
// connection details, the password-hashing pepper, and the S3-compatible
// storage credentials uploads depend on. Everything else already
// degrades gracefully at the point of use (infra/encryption.ts,
// infra/stripe.ts, infra/mailer.ts, infra/auth.ts's migrations-secret
// check) — crashing the whole app for those would contradict that
// design instead of complementing it, so they're validated as optional
// (warn, don't exit) below.
const requiredEnvSchema = z.object({
  POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required."),
  POSTGRES_PORT: z.coerce
    .number()
    .int("POSTGRES_PORT must be a valid integer.")
    .positive("POSTGRES_PORT must be a valid integer."),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required."),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required."),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required."),
  PEPPER: z.string().min(1, "PEPPER is required."),
  STORAGE_BUCKET: z.string().min(1, "STORAGE_BUCKET is required."),
  STORAGE_ACCESS_KEY_ID: z
    .string()
    .min(1, "STORAGE_ACCESS_KEY_ID is required."),
  STORAGE_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "STORAGE_SECRET_ACCESS_KEY is required."),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

// Each has its own graceful degradation already — see the comment above.
// Warned about, not required, so a deploy that never touches that
// feature (e.g. no Stripe billing configured yet) doesn't fail to boot.
const OPTIONAL_ENV_KEYS = [
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "MIGRATIONS_SECRET",
  "STORAGE_REGION",
  "STORAGE_ENDPOINT",
  "STORAGE_FORCE_PATH_STYLE",
  "MAX_FILE_SIZE_MB",
  "RESEND_API_KEY",
  "MAIL_FROM_ADDRESS",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO",
  "STRIPE_PRICE_ID_BUSINESS",
] as const;

// Called once from instrumentation.ts on server startup — never during
// `next build`, since Next.js only invokes the instrumentation hook when
// an actual server instance boots (dev server, production server, or a
// serverless function's cold start).
export function validateEnv(): void {
  const result = requiredEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      "Missing or invalid required environment variables:\n" +
        result.error.issues
          .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
    );
    process.exit(1);
  }

  const missingOptional = OPTIONAL_ENV_KEYS.filter((key) => !process.env[key]);

  if (missingOptional.length > 0) {
    console.warn(
      `Optional environment variables not set (related features will degrade gracefully): ${missingOptional.join(", ")}`,
    );
  }
}
