import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import storage from "../../../../infra/storage";
import { ValidationError } from "../../../../infra/errors";
import documentModel from "../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentPublic,
} from "../../../../types/index";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const MAX_SIZE_BYTES = parseInt(
  process.env.MAX_FILE_SIZE_BYTES ?? String(50 * 1024 * 1024),
  10,
);

export const config = {
  api: {
    bodyParser: false,
  },
};

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.post(postHandler);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<DocumentPublic>,
) {
  const form = formidable({ maxFileSize: MAX_SIZE_BYTES });

  const [fields, files] = await form.parse(request);

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!uploadedFile) {
    throw new ValidationError({
      message: "Nenhum arquivo foi enviado.",
      action: "Envie um arquivo no campo 'file'.",
    });
  }

  if (!ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype ?? "")) {
    throw new ValidationError({
      message: `Tipo de arquivo não suportado: ${uploadedFile.mimetype}.`,
      action: "Envie um arquivo PDF, DOCX ou PPTX.",
    });
  }

  const rawTitle = Array.isArray(fields.title) ? fields.title[0] : fields.title;
  const rawDescription = Array.isArray(fields.description)
    ? fields.description[0]
    : fields.description;

  const title = rawTitle?.trim();
  if (!title) {
    throw new ValidationError({
      message: "O campo 'title' é obrigatório.",
      action: "Forneça um título para o documento.",
    });
  }

  const ext = path.extname(uploadedFile.originalFilename ?? "");
  const storageKey = `${request.user!.id}/${crypto.randomUUID()}${ext}`;

  const buffer = await fs.readFile(uploadedFile.filepath);

  await storage.save(storageKey, buffer, uploadedFile.mimetype!);

  const trimmedDescription = rawDescription?.trim();
  const createInput = {
    title,
    original_filename: uploadedFile.originalFilename ?? "unknown",
    storage_key: storageKey,
    mime_type: uploadedFile.mimetype!,
    size_bytes: uploadedFile.size,
    user_id: request.user!.id,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
  };

  const doc = await documentModel.create(createInput);

  return response.status(201).json(doc);
}

async function getHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse,
) {
  const page = Math.max(
    1,
    parseInt((request.query.page as string) ?? "1", 10) || 1,
  );
  const limit = Math.min(
    100,
    Math.max(1, parseInt((request.query.limit as string) ?? "20", 10) || 20),
  );

  const { documents, total } = await documentModel.findAllByUserId(
    request.user!.id,
    page,
    limit,
  );

  return response.status(200).json({
    data: documents,
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}
