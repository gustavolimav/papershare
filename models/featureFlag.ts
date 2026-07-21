import database from "../infra/database";
import { ServiceError } from "../infra/errors";
import { FEATURE_FLAG_KEYS } from "../types/index";
import type {
  FeatureFlag,
  FeatureFlagKey,
  FeatureFlagModel,
  FeatureFlagsResponse,
} from "../types/index";

async function isEnabled(key: FeatureFlagKey): Promise<boolean> {
  const results = await database.query<{ enabled: boolean }>({
    text: `SELECT enabled FROM feature_flags WHERE key = $1;`,
    values: [key],
  });

  return results.rows[0]?.enabled === true;
}

// Same wording/status code as infra/stripe.ts#requireStripeConfigured —
// from the caller's side, "not enabled yet" and "not configured yet" are
// the same degrade-gracefully outcome.
async function requireEnabled(key: FeatureFlagKey): Promise<void> {
  if (!(await isEnabled(key))) {
    throw new ServiceError({
      message: "Esse recurso ainda não está disponível.",
      action: "Em breve.",
    });
  }
}

async function setEnabled(
  key: FeatureFlagKey,
  enabled: boolean,
): Promise<FeatureFlag> {
  const results = await database.query<FeatureFlag>({
    text: `
        INSERT INTO
          feature_flags (key, enabled)
        VALUES
          ($1, $2)
        ON CONFLICT (key) DO UPDATE
        SET
          enabled = $2,
          updated_at = timezone('utc', now())
        RETURNING
          *
        ;`,
    values: [key, enabled],
  });

  return results.rows[0]!;
}

async function getAll(): Promise<FeatureFlagsResponse> {
  const flags = await Promise.all(FEATURE_FLAG_KEYS.map(isEnabled));

  return Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key, index) => [key, flags[index]]),
  ) as FeatureFlagsResponse;
}

const featureFlag: FeatureFlagModel = {
  isEnabled,
  requireEnabled,
  setEnabled,
  getAll,
};

export default featureFlag;
