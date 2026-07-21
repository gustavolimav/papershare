import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../infra/controller";
import { rateLimit } from "../../../../infra/rate-limit";
import { NotFoundError } from "../../../../infra/errors";
import {
  validate,
  passwordResetRequestSchema,
} from "../../../../infra/schemas";
import user from "../../../../models/user";
import passwordReset from "../../../../models/passwordReset";
import mailer from "../../../../infra/mailer";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(rateLimit({ limit: 5, windowMs: 60 * 1000 }), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request: NextApiRequest, response: NextApiResponse) {
  const { email } = validate(passwordResetRequestSchema, request.body);

  try {
    const foundUser = await user.findOneByEmail(email);
    const resetToken = await passwordReset.create(foundUser.id);
    const resetUrl = `${getBaseUrl(request)}/reset-password/${resetToken.token}`;

    await mailer.sendPasswordResetEmail({ to: foundUser.email, resetUrl });
  } catch (error) {
    // Same response whether the email exists or not — otherwise this
    // endpoint becomes an oracle for checking which emails are registered.
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
  }

  return response.status(204).end();
}

function getBaseUrl(request: NextApiRequest): string {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  return `${protocol}://${host}`;
}
