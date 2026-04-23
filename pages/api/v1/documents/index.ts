import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import formidable from "formidable";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  validate,
  documentCreateSchema,
} from "../../../../infra/schemas";
import { ValidationError } from "../../../../infra/errors";
import storage from "../../../../infra/storage";
import document from "../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentListResponse,
  DocumentResponse,
} from "../../../../types/index";

export const config = {
  api: {
    bodyParser: false,
  },
};

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<DocumentListResponse>,
) {
  const rawPage = parseInt(String(request.query.page ?? "1"), 10);
  const rawPerPage = parseInt(String(request.query.per_page ?? "10"), 10);

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const perPage =
    isNaN(rawPerPage) || rawPerPage < 1
      ? 10
      : rawPerPage > 100
        ? 100
        : rawPerPage;

  const result = await document.findAllByUserId(
    request.user!.id,
    page,
    perPage,
  );

  return response.status(200).json(result);
}

async function postHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<DocumentResponse>,
) {
  const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES });

  let fields: formidable.Fields;
  let files: formidable.Files;

  try {
    [fields, files] = await form.parse(request);
  } catch (_err) {
    throw new ValidationError({
      message: "O arquivo enviado excede o tamanho máximo permitido.",
      action: `Envie um arquivo com no máximo ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.`,
    });
  }

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!uploadedFile) {
    throw new ValidationError({
      message: "O arquivo é obrigatório.",
      action: "Envie um arquivo no campo 'file' do formulário.",
    });
  }

  const mimeType = uploadedFile.mimetype ?? "";

  if (
    !ALLOWED_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new ValidationError({
      message: `Tipo de arquivo não permitido: ${mimeType || "desconhecido"}.`,
      action: `Envie um arquivo dos tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    });
  }

  const rawTitle = Array.isArray(fields.title) ? fields.title[0] : fields.title;
  const rawDescription = Array.isArray(fields.description)
    ? fields.description[0]
    : fields.description;

  const validated = validate(documentCreateSchema, {
    title: rawTitle,
    description: rawDescription,
  });

  const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);

  let pageCount: number | null = null;

  if (mimeType === "application/pdf") {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const info = await parser.getInfo();
      pageCount = info.total;
      await parser.destroy();
    } catch (_err) {
      pageCount = null;
    }
  }

  const { key, size, id } = await storage.saveFile(
    fileBuffer,
    uploadedFile.originalFilename ?? "upload",
  );

  const created = await document.create({
    id,
    title: validated.title,
    description: validated.description,
    original_filename: uploadedFile.originalFilename ?? "upload",
    storage_key: key,
    mime_type: mimeType,
    size_bytes: size,
    page_count: pageCount,
    user_id: request.user!.id,
  });

  return response.status(201).json(created);
}
