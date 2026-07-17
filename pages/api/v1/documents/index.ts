import fs from "fs/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import { formidable, errors as formidableErrors } from "formidable";
import controller from "../../../../infra/controller";
import { authMiddleware } from "../../../../infra/auth";
import { ValidationError } from "../../../../infra/errors";
import storage from "../../../../infra/storage";
import {
  validate,
  documentCreateSchema,
  paginationSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../../../infra/schemas";
import document from "../../../../models/document";
import summarizer from "../../../../models/summarizer";
import type {
  AuthenticatedNextApiRequest,
  DocumentResponse,
  DocumentListResponse,
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
  const { page, per_page } = validate(paginationSchema, request.query);

  const result = await document.findAllByUserId(request.user!.id, {
    page,
    perPage: per_page,
  });

  return response.status(200).json(result);
}

async function postHandler(
  request: AuthenticatedNextApiRequest,
  response: NextApiResponse<DocumentResponse>,
) {
  const { fields, file } = await parseUpload(request);

  const { title, description } = validate(documentCreateSchema, {
    title: fields.title?.[0],
    description: fields.description?.[0],
  });

  if (!file) {
    throw new ValidationError({
      message: "O arquivo é obrigatório.",
      action: "Envie um arquivo para realizar esta operação.",
    });
  }

  if (
    !file.mimetype ||
    !ALLOWED_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
    )
  ) {
    throw new ValidationError({
      message: `Tipo de arquivo não suportado. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(", ")}.`,
      action: "Envie um arquivo PDF, DOCX ou PPTX.",
    });
  }

  const originalFilename = file.originalFilename ?? "arquivo";
  const fileBuffer = await fs.readFile(file.filepath);
  const pageCount = await extractPageCount(file.mimetype, fileBuffer);
  const saved = await storage.saveFile(fileBuffer, originalFilename);

  const newDocument = await document.create({
    title,
    ...(description !== undefined && { description }),
    original_filename: originalFilename,
    storage_key: saved.key,
    mime_type: file.mimetype,
    size_bytes: saved.size,
    page_count: pageCount,
    user_id: request.user!.id,
  });

  // Fire-and-forget, same pattern as the new-viewer notification email:
  // never blocks or affects the upload response, and any failure (API
  // error, unsupported file type, missing key) just leaves ai_summary null.
  summarizer.summarizeDocument(newDocument, fileBuffer).catch(() => undefined);

  return response.status(201).json(newDocument);
}

async function parseUpload(request: NextApiRequest) {
  const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES });

  try {
    const [fields, files] = await form.parse(request);
    return { fields, file: files.file?.[0] };
  } catch (error) {
    const errorCode = (error as { code?: number }).code;

    // a single-file upload hits the "total" size check before the per-file
    // one, since formidable defaults maxTotalFileSize to maxFileSize
    if (
      errorCode === formidableErrors.biggerThanMaxFileSize ||
      errorCode === formidableErrors.biggerThanTotalMaxFileSize
    ) {
      throw new ValidationError({
        message: `O arquivo excede o tamanho máximo permitido de ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
        action: "Envie um arquivo menor.",
      });
    }

    throw error;
  }
}

async function extractPageCount(
  mimeType: string,
  fileBuffer: Buffer,
): Promise<number | null> {
  if (mimeType !== "application/pdf") {
    return null;
  }

  // Imported lazily, only for actual PDF uploads: pdf-parse pulls in
  // pdfjs-dist's legacy build, which needs the native @napi-rs/canvas
  // binary to polyfill browser canvas globals (DOMMatrix, etc.). When that
  // binary isn't available for the current runtime (observed on Vercel's
  // Linux functions), pdfjs-dist's internal geometry code throws in a way
  // that isn't reliably catchable here (it isn't tied to the promise this
  // function awaits) and crashes the whole request. So probe for the
  // canvas binary first — that failure mode *is* a normal, catchable
  // module-resolution error — and skip page-count extraction entirely
  // rather than risk calling into pdf-parse without it.
  try {
    await import("@napi-rs/canvas");
  } catch {
    return null;
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: fileBuffer });

    try {
      const info = await parser.getInfo();
      return info.total;
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}
