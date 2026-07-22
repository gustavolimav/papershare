import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import { validate, paginationSchema } from "../../../../../../infra/schemas";
import shareLink from "../../../../../../models/shareLink";
import type {
  AuthenticatedNextApiRequest,
  WorkspaceLinksResponse,
} from "../../../../../../types/index";

interface WorkspaceLinksRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: WorkspaceLinksRequest,
  response: NextApiResponse<WorkspaceLinksResponse>,
) {
  const id = request.query.id as string;
  const { page, per_page } = validate(paginationSchema, request.query);

  const result = await shareLink.findAllByWorkspaceId(id, request.user!.id, {
    page,
    perPage: per_page,
  });

  return response.status(200).json(result);
}
