import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { requireSuperadminMiddleware } from "../../../../../infra/auth";
import { NotFoundError } from "../../../../../infra/errors";
import {
  validate,
  featureFlagUpdateSchema,
} from "../../../../../infra/schemas";
import featureFlag from "../../../../../models/featureFlag";
import { FEATURE_FLAG_KEYS } from "../../../../../types/index";
import type { FeatureFlag, FeatureFlagKey } from "../../../../../types/index";

interface FeatureFlagRequest extends NextApiRequest {
  query: {
    key?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(requireSuperadminMiddleware);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: FeatureFlagRequest,
  response: NextApiResponse<FeatureFlag>,
) {
  const key = request.query.key as string;

  if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
    throw new NotFoundError({
      message: "Nenhuma feature flag encontrada com essa chave.",
      action: "Verifique se a chave informada está correta.",
    });
  }

  const { enabled } = validate(featureFlagUpdateSchema, request.body);
  const flag = await featureFlag.setEnabled(key as FeatureFlagKey, enabled);

  return response.status(200).json(flag);
}
