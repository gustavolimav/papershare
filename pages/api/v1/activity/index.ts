import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { parsePagination } from "../../../../infra/pagination";
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
  const pagination = parsePagination(request.query);

  const result = await activity.findAllByWorkspaceId(
    request.user!.active_workspace_id!,
    pagination,
  );

  return response.status(200).json(result);
}
