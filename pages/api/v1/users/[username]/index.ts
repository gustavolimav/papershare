import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import controller from '../../../../../infra/controller.ts';
import users from '../../../../../models/user.ts';
import type { UserUpdateInput, UserPublic } from '../../../../../types/index.ts';

interface UserRequest extends NextApiRequest {
  query: {
    username?: string;
  } & NextApiRequest['query'];
}

interface UserUpdateRequest extends UserRequest {
  body: UserUpdateInput;
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(getHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request: UserRequest, response: NextApiResponse<UserPublic>) {
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

async function patchHandler(request: UserUpdateRequest, response: NextApiResponse<UserPublic>) {
  const username = request.query.username as string;
  const userInputValues: UserUpdateInput = request.body;

  const updatedUser = await users.updateByUsername(username, userInputValues);

  return response.status(200).json({
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  });
}
