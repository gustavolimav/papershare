import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { validate, documentUpdateSchema } from "../../../../../infra/schemas";
import storage from "../../../../../infra/storage";
import document from "../../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentResponse,
  DocumentUpdateInput,
} from "../../../../../types/index";

interface DocumentRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: DocumentRequest,
  response: NextApiResponse<DocumentResponse>,
) {
  const id = request.query.id as string;

  const doc = await document.findOneById(id, request.user!.id);

  return response.status(200).json(doc);
}

async function patchHandler(
  request: DocumentRequest,
  response: NextApiResponse<DocumentResponse>,
) {
  const id = request.query.id as string;

  const validated = validate(documentUpdateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DocumentUpdateInput;

  const updated = await document.updateById(id, request.user!.id, input);

  return response.status(200).json(updated);
}

async function deleteHandler(
  request: DocumentRequest,
  response: NextApiResponse,
) {
  const id = request.query.id as string;

  const storageKey = await document.deleteById(id, request.user!.id);

  await storage.deleteFile(storageKey);

  return response.status(204).end();
}
