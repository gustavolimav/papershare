import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import document from "../../../../../../models/document";
import linkView from "../../../../../../models/linkView";
import type {
  AuthenticatedNextApiRequest,
  DocumentAnalyticsResponse,
} from "../../../../../../types/index";

interface DocumentAnalyticsRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: DocumentAnalyticsRequest,
  response: NextApiResponse<DocumentAnalyticsResponse>,
) {
  const documentId = request.query.id as string;

  await document.findOneById(documentId, request.user!.id);

  const analytics = await linkView.getAnalyticsByDocumentId(documentId);

  return response.status(200).json(analytics);
}
