import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../../infra/auth";
import {
  validate,
  followupEmailCreateSchema,
} from "../../../../../../../../infra/schemas";
import followupEmail from "../../../../../../../../models/followupEmail";
import type {
  AuthenticatedNextApiRequest,
  FollowUpEmailSuggestion,
} from "../../../../../../../../types/index";

interface FollowUpEmailRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
    linkId?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: FollowUpEmailRequest,
  response: NextApiResponse<FollowUpEmailSuggestion>,
) {
  const documentId = request.query.id as string;
  const linkId = request.query.linkId as string;

  const { viewer_fingerprint } = validate(
    followupEmailCreateSchema,
    request.body,
  );

  const suggestion = await followupEmail.generateSuggestion(
    documentId,
    linkId,
    request.user!.id,
    viewer_fingerprint,
  );

  return response.status(200).json(suggestion);
}
