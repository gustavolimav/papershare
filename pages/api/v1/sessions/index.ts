import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import * as cookie from "cookie";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { rateLimit } from "../../../../infra/rate-limit";
import { validate, authenticationSchema } from "../../../../infra/schemas";
import authentication from "../../../../models/authentication";
import session from "../../../../models/session";
import type {
  AuthenticatedNextApiRequest,
  Session,
} from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(rateLimit({ limit: 5, windowMs: 60 * 1000 }), postHandler);
router.delete(authMiddleware, deleteHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: NextApiRequest,
  response: NextApiResponse<Session>,
) {
  const userInputValue = validate(authenticationSchema, request.body);

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

async function deleteHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse,
) {
  await session.deleteByToken(request.session!.token);

  const expiredCookie = cookie.serialize("session_id", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  response.setHeader("Set-Cookie", expiredCookie);

  return response.status(204).end();
}
