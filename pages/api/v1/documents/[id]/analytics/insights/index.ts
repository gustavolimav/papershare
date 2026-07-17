import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import analyticsInsights from "../../../../../../../models/analyticsInsights";
import type {
  AuthenticatedNextApiRequest,
  AnalyticsInsightResponse,
} from "../../../../../../../types/index";

interface InsightsRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: InsightsRequest,
  response: NextApiResponse<AnalyticsInsightResponse>,
) {
  const documentId = request.query.id as string;

  const insights = await analyticsInsights.getInsights(
    documentId,
    request.user!.id,
  );

  return response.status(200).json(insights);
}
