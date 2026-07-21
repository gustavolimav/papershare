import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { rateLimit } from "../../../../../infra/rate-limit";
import { NotFoundError } from "../../../../../infra/errors";
import { validate, passwordResetSchema } from "../../../../../infra/schemas";
import user from "../../../../../models/user";
import session from "../../../../../models/session";
import passwordReset from "../../../../../models/passwordReset";

interface PasswordResetRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// No authMiddleware: the token itself is the credential here. Rate limited
// because it's an unauthenticated endpoint that accepts a secret.
router.patch(rateLimit({ limit: 5, windowMs: 60 * 1000 }), patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: PasswordResetRequest,
  response: NextApiResponse,
) {
  const token = request.query.token as string;
  const { password: newPassword } = validate(passwordResetSchema, request.body);

  const validToken = await passwordReset.findValidByToken(token);

  if (!validToken) {
    throw new NotFoundError({
      message: "O link de redefinição de senha é inválido ou expirou.",
      action: "Solicite um novo link de redefinição de senha.",
    });
  }

  await user.resetPassword(validToken.user_id, newPassword);
  // Invalidate the token (single use) and every existing session (a reset
  // password should log out any session started with the old one).
  await passwordReset.deleteByUserId(validToken.user_id);
  await session.deleteByUserId(validToken.user_id);

  return response.status(204).end();
}
