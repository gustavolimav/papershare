import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { rateLimit } from "../../../../infra/rate-limit";
import { validate, userCreateSchema } from "../../../../infra/schemas";
import users from "../../../../models/user";
import type { UserPublic } from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(rateLimit({ limit: 10, windowMs: 60 * 1000 }), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: NextApiRequest,
  response: NextApiResponse<UserPublic>,
) {
  const userInputValues = validate(userCreateSchema, request.body);

  const newUser = await users.create(userInputValues);

  return response.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  });
}
