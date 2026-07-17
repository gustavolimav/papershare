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
  UserPublic,
} from "../../../../types/index";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(authMiddleware, getHandler);
router.post(rateLimit({ limit: 5, windowMs: 60 * 1000 }), postHandler);
router.delete(authMiddleware, deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<UserPublic>,
) {
  const user = request.user!;

  return response.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
    is_superadmin: user.is_superadmin,
    active_workspace_id: user.active_workspace_id,
  });
}

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
    sameSite: "lax",
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
    sameSite: "lax",
  });

  response.setHeader("Set-Cookie", expiredCookie);

  return response.status(204).end();
}
