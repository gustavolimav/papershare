import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { validate, documentUpdateSchema } from "../../../../../infra/schemas";
import { deleteFile } from "../../../../../infra/storage";
import document from "../../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentPublic,
  DocumentUpdateInput,
} from "../../../../../types/index";

interface DocumentRequest extends AuthenticatedNextApiRequest {
  query: { id?: string } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: DocumentRequest,
  response: NextApiResponse<DocumentPublic>,
) {
  const doc = await document.findOneById(
    request.query.id as string,
    request.user!.id,
  );

  return response.status(200).json(doc);
}

async function patchHandler(
  request: DocumentRequest,
  response: NextApiResponse<DocumentPublic>,
) {
  const validated = validate(documentUpdateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DocumentUpdateInput;

  const updated = await document.updateById(
    request.query.id as string,
    request.user!.id,
    input,
  );

  return response.status(200).json(updated);
}

async function deleteHandler(
  request: DocumentRequest,
  response: NextApiResponse,
) {
  const id = request.query.id as string;
  const userId = request.user!.id;

  const storageKey = await document.deleteById(id, userId);
  await deleteFile(storageKey);

  return response.status(204).end();
}
