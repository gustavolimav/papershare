import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../../infra/auth";
import document from "../../../../../../../../models/document";
import shareLink from "../../../../../../../../models/shareLink";
import linkView from "../../../../../../../../models/linkView";
import type {
  AuthenticatedNextApiRequest,
  LinkAnalyticsResponse,
} from "../../../../../../../../types/index";

interface LinkAnalyticsRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
    linkId?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: LinkAnalyticsRequest,
  response: NextApiResponse<LinkAnalyticsResponse>,
) {
  const documentId = request.query.id as string;
  const linkId = request.query.linkId as string;

  await document.findOneById(documentId, request.user!.id);
  await shareLink.findOneById(linkId, documentId);

  const analytics = await linkView.getAnalyticsByLinkId(linkId);

  return response.status(200).json(analytics);
}
