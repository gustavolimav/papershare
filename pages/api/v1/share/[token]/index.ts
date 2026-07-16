import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { rateLimit } from "../../../../../infra/rate-limit";
import shareLink from "../../../../../models/shareLink";
import type { ShareLinkWithDocument } from "../../../../../types/index";

interface ShareRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// No authMiddleware: this route is intentionally public. Rate limited
// because it's the only unauthenticated endpoint that accepts a secret
// (the optional link password) — without a limit it would be brute-forceable.
router.get(rateLimit({ limit: 20, windowMs: 60 * 1000 }), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: ShareRequest,
  response: NextApiResponse<ShareLinkWithDocument>,
) {
  const token = request.query.token as string;
  // Header only, no query-param fallback: query strings end up in server
  // and proxy access logs, browser history, and Referer headers.
  const providedPassword = request.headers["x-share-password"];
  const providedEmail = request.headers["x-viewer-email"];
  const providedName = request.headers["x-viewer-name"];

  const result = await shareLink.getByToken(
    token,
    typeof providedPassword === "string" ? providedPassword : undefined,
    typeof providedEmail === "string" ? providedEmail : undefined,
    typeof providedName === "string" ? providedName : undefined,
  );

  return response.status(200).json(result);
}
