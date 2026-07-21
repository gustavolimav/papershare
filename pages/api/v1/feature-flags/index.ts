import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import featureFlag from "../../../../models/featureFlag";
import type { FeatureFlagsResponse } from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequest,
  response: NextApiResponse<FeatureFlagsResponse>,
) {
  const flags = await featureFlag.getAll();
  return response.status(200).json(flags);
}
