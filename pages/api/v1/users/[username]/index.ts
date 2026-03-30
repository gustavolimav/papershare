import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { ForbiddenError } from "../../../../../infra/errors";
import { validate, userUpdateSchema } from "../../../../../infra/schemas";
import users from "../../../../../models/user";
import session from "../../../../../models/session";
import type {
  AuthenticatedNextApiRequest,
  UserPublic,
} from "../../../../../types/index";

interface UserRequest extends AuthenticatedNextApiRequest {
  query: {
    username?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: UserRequest,
  response: NextApiResponse<UserPublic>,
) {
  const username = request.query.username as string;

  const user = await users.findOneByUsername(username);

  return response.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  });
}

async function patchHandler(
  request: UserRequest,
  response: NextApiResponse<UserPublic>,
) {
  const username = request.query.username as string;

  if (request.user!.username.toLowerCase() !== username.toLowerCase()) {
    throw new ForbiddenError({
      message: "Você não tem permissão para atualizar este usuário.",
      action: "Você só pode atualizar o seu próprio perfil.",
    });
  }

  const userInputValues = validate(userUpdateSchema, request.body);

  const updatedUser = await users.updateByUsername(username, userInputValues);

  return response.status(200).json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  });
}

async function deleteHandler(request: UserRequest, response: NextApiResponse) {
  const username = request.query.username as string;

  if (request.user!.username.toLowerCase() !== username.toLowerCase()) {
    throw new ForbiddenError({
      message: "Você não tem permissão para deletar este usuário.",
      action: "Você só pode deletar o seu próprio perfil.",
    });
  }

  await session.deleteByUserId(request.user!.id);
  await users.deleteByUsername(username);

  return response.status(204).end();
}
