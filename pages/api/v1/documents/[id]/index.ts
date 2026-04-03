import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { validate, documentUpdateSchema } from "../../../../../infra/schemas";
import documentModel from "../../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentPublic,
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
  response: NextApiResponse<DocumentPublic>,
) {
  const id = request.query.id as string;
  const doc = await documentModel.findOneById(id);

  return response.status(200).json({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    original_filename: doc.original_filename,
    mime_type: doc.mime_type,
    size_bytes: doc.size_bytes,
    page_count: doc.page_count,
    user_id: doc.user_id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  });
}

async function patchHandler(
  request: DocumentRequest,
  response: NextApiResponse<DocumentPublic>,
) {
  const id = request.query.id as string;

  const validated = validate(documentUpdateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DocumentUpdateInput;

  const updated = await documentModel.updateById(id, request.user!.id, input);

  return response.status(200).json(updated);
}

async function deleteHandler(
  request: DocumentRequest,
  response: NextApiResponse,
) {
  const id = request.query.id as string;

  await documentModel.deleteById(id, request.user!.id);

  return response.status(204).end();
}
