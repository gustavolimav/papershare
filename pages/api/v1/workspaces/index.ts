import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { validate, workspaceCreateSchema } from "../../../../infra/schemas";
import workspace from "../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  Workspace,
  WorkspaceWithRole,
} from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<WorkspaceWithRole[]>,
) {
  const workspaces = await workspace.findAllByUserId(request.user!.id);

  return response.status(200).json(workspaces);
}

async function postHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<Workspace>,
) {
  const { name } = validate(workspaceCreateSchema, request.body);

  const newWorkspace = await workspace.create(request.user!.id, name);

  return response.status(201).json(newWorkspace);
}
