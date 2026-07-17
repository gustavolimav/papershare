import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import {
  validate,
  workspaceMemberInviteSchema,
} from "../../../../../../infra/schemas";
import workspace from "../../../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  WorkspaceMemberResponse,
} from "../../../../../../types/index";

interface WorkspaceMembersRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: WorkspaceMembersRequest,
  response: NextApiResponse<WorkspaceMemberResponse[]>,
) {
  const id = request.query.id as string;

  const members = await workspace.listMembers(id, request.user!.id);

  return response.status(200).json(members);
}

async function postHandler(
  request: WorkspaceMembersRequest,
  response: NextApiResponse<WorkspaceMemberResponse>,
) {
  const id = request.query.id as string;

  const { email, role } = validate(workspaceMemberInviteSchema, request.body);

  const newMember = await workspace.inviteMember(
    id,
    request.user!.id,
    email,
    role,
  );

  return response.status(201).json(newMember);
}
