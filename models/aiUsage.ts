import database from "../infra/database";
import { TooManyRequestsError } from "../infra/errors";

// Shared cost-protection backstop for every AI feature that lets an
// authenticated user trigger a paid API call on demand (summary
// regeneration, insight regeneration, follow-up email drafts). Checks the
// count within the trailing window and records this call in the same pass
// — callers should call this right before doing the actual AI work, not
// after, so a failed/aborted call still counts (conservative by design).
//
// `subjectId` is whatever dimension the feature is limited by: a user id
// for a per-user cap (summary regeneration, follow-up emails), or a
// document id for a per-document cap (insight regeneration) — not a
// foreign key, since it can point at either table.
async function checkAndRecord(
  subjectId: string,
  feature: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const result = await database.query<{ count: string }>({
    text: `
        SELECT
          COUNT(*)::text AS count
        FROM
          ai_usage_log
        WHERE
          subject_id = $1
          AND feature = $2
          AND created_at > NOW() - ($3 || ' milliseconds')::interval
        ;`,
    values: [subjectId, feature, windowMs],
  });

  if (Number(result.rows[0]!.count) >= limit) {
    throw new TooManyRequestsError();
  }

  await database.query({
    text: `
        INSERT INTO
          ai_usage_log (subject_id, feature)
        VALUES
          ($1, $2)
        ;`,
    values: [subjectId, feature],
  });
}

const aiUsage = {
  checkAndRecord,
};

export default aiUsage;
