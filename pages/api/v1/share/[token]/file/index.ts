import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { rateLimit } from "../../../../../../infra/rate-limit";
import shareLink from "../../../../../../models/shareLink";
import storage from "../../../../../../infra/storage";

interface FileRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// No authMiddleware: intentionally public, re-validates the share token
// (and password) itself. Rate-limited for the same reason as the sibling
// /view and /share/[token] endpoints — it's unauthenticated and could
// otherwise be used to brute-force a link's password.
router.get(rateLimit({ limit: 20, windowMs: 60 * 1000 }), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request: FileRequest, response: NextApiResponse) {
  const token = request.query.token as string;
  const providedPassword = request.headers["x-share-password"];
  const providedEmail = request.headers["x-viewer-email"];

  const { storage_key, mime_type } = await shareLink.getFileByToken(
    token,
    typeof providedPassword === "string" ? providedPassword : undefined,
    typeof providedEmail === "string" ? providedEmail : undefined,
  );

  const file = await storage.getFile(storage_key);

  response.setHeader("Content-Type", mime_type || file.contentType);
  response.setHeader("Cache-Control", "private, max-age=0, no-store");
  return response.status(200).send(file.body);
}
