import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../../infra/auth";
import document from "../../../../../../../../models/document";
import shareLink from "../../../../../../../../models/shareLink";
import linkView from "../../../../../../../../models/linkView";
import subscription from "../../../../../../../../models/subscription";
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

  const doc = await document.findOneById(documentId, request.user!.id);
  await shareLink.findOneById(linkId, documentId, request.user!.id);

  const analytics = await linkView.getAnalyticsByLinkId(linkId, doc.page_count);

  // Engagement scoring is a Pro feature — everything else in this response
  // (aggregate stats, page breakdown) isn't gated, so only this field is
  // nulled out instead of blocking the whole endpoint.
  const plan = await subscription.getPlanForWorkspace(doc.workspace_id);
  if (plan === "free") {
    analytics.viewers = null;
  }

  return response.status(200).json(analytics);
}
