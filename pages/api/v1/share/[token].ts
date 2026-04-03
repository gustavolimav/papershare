import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import shareLink from "../../../../models/shareLink";
import type { ShareLinkWithDocument } from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequest,
  response: NextApiResponse<ShareLinkWithDocument>,
) {
  const token = request.query.token as string;
  const password = request.query.password as string | undefined;

  const result = await shareLink.getByToken(token, password);

  return response.status(200).json(result);
}
