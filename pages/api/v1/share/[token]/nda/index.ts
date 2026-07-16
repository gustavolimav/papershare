import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { rateLimit } from "../../../../../../infra/rate-limit";
import shareLink from "../../../../../../models/shareLink";

interface NdaRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// No authMiddleware: intentionally public — the NDA text itself isn't
// sensitive (it's meant to be read before any password/email/name is
// provided). Rate-limited like the sibling public share endpoints, mostly
// to stay consistent rather than because this one leaks a guessable secret.
router.get(rateLimit({ limit: 20, windowMs: 60 * 1000 }), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: NdaRequest,
  response: NextApiResponse<{ nda_text: string | null }>,
) {
  const token = request.query.token as string;
  const ndaText = await shareLink.getNdaText(token);

  return response.status(200).json({ nda_text: ndaText });
}
