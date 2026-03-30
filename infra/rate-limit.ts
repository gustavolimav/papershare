import type { NextApiRequest, NextApiResponse } from "next";
import { TooManyRequestsError } from "./errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  return function rateLimitMiddleware(
    request: NextApiRequest,
    _response: NextApiResponse,
    next: () => void | Promise<void>,
  ): void | Promise<void> {
    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      request.socket?.remoteAddress ||
      "unknown";

    const key = `${request.url}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      throw new TooManyRequestsError();
    }

    entry.count++;
    return next();
  };
}
