import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { validate, workspaceUpdateSchema } from "../../../../../infra/schemas";
import workspace from "../../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  Workspace,
} from "../../../../../types/index";

interface WorkspaceRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: WorkspaceRequest,
  response: NextApiResponse<Workspace>,
) {
  const id = request.query.id as string;

  const { name } = validate(workspaceUpdateSchema, request.body);

  const updatedWorkspace = await workspace.updateById(
    id,
    request.user!.id,
    name,
  );

  return response.status(200).json(updatedWorkspace);
}

async function deleteHandler(
  request: WorkspaceRequest,
  response: NextApiResponse,
) {
  const id = request.query.id as string;

  await workspace.deleteById(id, request.user!.id);

  return response.status(204).end();
}
