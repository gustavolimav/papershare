import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import {
  validate,
  workspaceMemberRoleUpdateSchema,
} from "../../../../../../../infra/schemas";
import workspace from "../../../../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  WorkspaceMemberResponse,
} from "../../../../../../../types/index";

interface WorkspaceMemberRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
    userId?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: WorkspaceMemberRequest,
  response: NextApiResponse<WorkspaceMemberResponse>,
) {
  const id = request.query.id as string;
  const targetUserId = request.query.userId as string;

  const { role } = validate(workspaceMemberRoleUpdateSchema, request.body);

  const updatedMember = await workspace.updateMemberRole(
    id,
    request.user!.id,
    targetUserId,
    role,
  );

  return response.status(200).json(updatedMember);
}

async function deleteHandler(
  request: WorkspaceMemberRequest,
  response: NextApiResponse,
) {
  const id = request.query.id as string;
  const targetUserId = request.query.userId as string;

  await workspace.removeMember(id, request.user!.id, targetUserId);

  return response.status(204).end();
}
