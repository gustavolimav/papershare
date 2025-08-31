import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller.ts";
import authentication from "../../../../models/authentication.ts";
import session from "../../../../models/session.ts";
import * as cookie from "cookie";
import type { AuthenticationInput, Session } from "../../../../types/index.ts";

interface SessionCreateRequest extends NextApiRequest {
  body: AuthenticationInput;
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: SessionCreateRequest,
  response: NextApiResponse<Session>,
) {
  const userInputValue: AuthenticationInput = request.body;

  const authenticatedUser = await authentication.getAuthentication(
    userInputValue.email,
    userInputValue.password,
  );

  const newSession = await session.create(authenticatedUser.id);

  const cookieOptions = cookie.serialize("session_id", newSession.token, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  response.setHeader("Set-Cookie", cookieOptions);

  return response.status(201).json(newSession);
}
