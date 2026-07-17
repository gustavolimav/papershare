import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import { ForbiddenError } from "../../../../../../infra/errors";
import { validate, aiKeyUpdateSchema } from "../../../../../../infra/schemas";
import users from "../../../../../../models/user";
import type {
  AuthenticatedNextApiRequest,
  AiKeyStatusResponse,
} from "../../../../../../types/index";

interface AiKeyRequest extends AuthenticatedNextApiRequest {
  query: {
    username?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.put(putHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

function assertOwnAccount(request: AiKeyRequest): void {
  const username = request.query.username as string;

  if (request.user!.username.toLowerCase() !== username.toLowerCase()) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar esta configuração.",
      action: "Você só pode gerenciar a sua própria chave de IA.",
    });
  }
}

async function getHandler(
  request: AiKeyRequest,
  response: NextApiResponse<AiKeyStatusResponse>,
) {
  assertOwnAccount(request);

  const configured = await users.hasAiApiKey(request.user!.id);

  return response.status(200).json({ configured });
}

async function putHandler(
  request: AiKeyRequest,
  response: NextApiResponse<AiKeyStatusResponse>,
) {
  assertOwnAccount(request);

  const { api_key } = validate(aiKeyUpdateSchema, request.body);

  await users.setAiApiKey(request.user!.id, api_key);

  return response.status(200).json({ configured: true });
}

async function deleteHandler(
  request: AiKeyRequest,
  response: NextApiResponse<AiKeyStatusResponse>,
) {
  assertOwnAccount(request);

  await users.setAiApiKey(request.user!.id, null);

  return response.status(200).json({ configured: false });
}
