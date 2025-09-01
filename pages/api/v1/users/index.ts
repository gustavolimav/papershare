import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import users from "../../../../models/user";
import type { UserCreateInput, UserPublic } from "../../../../types/index";

interface UserCreateRequest extends NextApiRequest {
  body: UserCreateInput;
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: UserCreateRequest,
  response: NextApiResponse<UserPublic>,
) {
  const userInputValues: UserCreateInput = request.body;

  const newUser = await users.create(userInputValues);

  return response.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  });
}
