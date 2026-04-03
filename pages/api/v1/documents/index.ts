import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import formidable from "formidable";
import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { saveFile } from "../../../../infra/storage";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../../../infra/schemas";
import { ValidationError } from "../../../../infra/errors";
import document from "../../../../models/document";
import type {
  AuthenticatedNextApiRequest,
  DocumentPublic,
} from "../../../../types/index";

export const config = { api: { bodyParser: false } };

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(listHandler);
router.post(uploadHandler);

export default router.handler(controller.errorHandlers);

async function listHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse,
) {
  const page = Math.max(1, parseInt((request.query.page as string) ?? "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt((request.query.limit as string) ?? "20", 10)),
  );

  const result = await document.findAllByUserId(request.user!.id, page, limit);

  return response.status(200).json({
    data: result.documents,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  });
}

async function uploadHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<DocumentPublic>,
) {
  const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES });

  const [fields, files] = await form.parse(request);

  const uploaded = files.file?.[0];

  if (!uploaded) {
    throw new ValidationError({
      message: "Nenhum arquivo foi enviado.",
      action: "Envie um arquivo no campo 'file'.",
    });
  }

  const mimeType = uploaded.mimetype ?? "";

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError({
      message: "Tipo de arquivo não suportado.",
      action: "Envie um arquivo PDF, DOCX ou PPTX.",
    });
  }

  const title =
    (Array.isArray(fields.title) ? fields.title[0] : fields.title) ??
    uploaded.originalFilename ??
    "Sem título";

  const description = Array.isArray(fields.description)
    ? fields.description[0]
    : fields.description;

  const fileBuffer = await fs.readFile(uploaded.filepath);

  let pageCount: number | undefined;
  if (mimeType === "application/pdf") {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const info = await parser.getInfo();
      pageCount = info.total;
    } catch {
      // page count is optional — ignore parse errors
    }
  }

  const { key } = await saveFile(
    fileBuffer,
    uploaded.originalFilename ?? "file",
  );

  const createInput = {
    title,
    originalFilename: uploaded.originalFilename ?? "file",
    storageKey: key,
    mimeType,
    sizeBytes: uploaded.size,
    userId: request.user!.id,
    ...(description !== undefined && { description }),
    ...(pageCount !== undefined && { pageCount }),
  };

  const newDocument = await document.create(createInput);

  return response.status(201).json(newDocument);
}
