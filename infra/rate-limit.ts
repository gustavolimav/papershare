import type { NextApiRequest, NextApiResponse } from "next";
import database from "./database";
import { TooManyRequestsError } from "./errors";

// Postgres-backed so the count is shared across every instance (a
// serverless deploy target like Vercel gives each function invocation
// its own short-lived process, so an in-memory Map — this module's
// original implementation — never accumulates a meaningful count).
// Same "log one row per request, COUNT within a rolling window" shape
// as models/aiUsage.ts's existing limiter — no new infrastructure,
// consistent with this project's no-extra-infra approach.
export async function checkAndRecord(
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const result = await database.query<{ count: string }>({
    text: `
        SELECT
          COUNT(*)::text AS count
        FROM
          rate_limit_log
        WHERE
          key = $1
          AND created_at > NOW() - ($2 || ' milliseconds')::interval
        ;`,
    values: [key, windowMs],
  });

  if (Number(result.rows[0]!.count) >= limit) {
    throw new TooManyRequestsError();
  }

  await database.query({
    text: `
        INSERT INTO
          rate_limit_log (key)
        VALUES
          ($1)
        ;`,
    values: [key],
  });
}

export function rateLimit({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  if (process.env.NODE_ENV !== "production") {
    return (
      _request: NextApiRequest,
      _response: NextApiResponse,
      next: () => void | Promise<void>,
    ) => next();
  }

  return async function rateLimitMiddleware(
    request: NextApiRequest,
    _response: NextApiResponse,
    next: () => void | Promise<void>,
  ): Promise<void> {
    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      request.socket?.remoteAddress ||
      "unknown";

    const key = `${request.url}:${ip}`;
    await checkAndRecord(key, limit, windowMs);
    await next();
  };
}
