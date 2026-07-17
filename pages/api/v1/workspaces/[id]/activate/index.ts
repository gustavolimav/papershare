import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import workspace from "../../../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  Workspace,
} from "../../../../../../types/index";

interface ActivateRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: ActivateRequest,
  response: NextApiResponse<Workspace>,
) {
  const id = request.query.id as string;

  const activatedWorkspace = await workspace.activate(id, request.user!.id);

  return response.status(200).json(activatedWorkspace);
}
