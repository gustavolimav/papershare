import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { validate, paginationSchema } from "../../../../infra/schemas";
import activity from "../../../../models/activity";
import type {
  AuthenticatedNextApiRequest,
  ActivityListResponse,
} from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<ActivityListResponse>,
) {
  const { page, per_page } = validate(paginationSchema, request.query);

  const result = await activity.findAllByWorkspaceId(
    request.user!.active_workspace_id!,
    { page, perPage: per_page },
  );

  return response.status(200).json(result);
}
