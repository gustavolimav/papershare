import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import document from "../../../../../../models/document";
import summarizer from "../../../../../../models/summarizer";
import aiUsage from "../../../../../../models/aiUsage";
import type {
  AuthenticatedNextApiRequest,
  DocumentSummaryResponse,
} from "../../../../../../types/index";

interface SummaryRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const REGENERATE_LIMIT_PER_HOUR = 3;

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: SummaryRequest,
  response: NextApiResponse<DocumentSummaryResponse>,
) {
  const documentId = request.query.id as string;

  const doc = await document.findOneById(documentId, request.user!.id);

  return response.status(200).json({
    summary: doc.ai_summary,
    generated_at: doc.ai_summary_generated_at,
  });
}

async function postHandler(
  request: SummaryRequest,
  response: NextApiResponse<DocumentSummaryResponse>,
) {
  const documentId = request.query.id as string;

  const doc = await document.findOneById(documentId, request.user!.id);

  await aiUsage.checkAndRecord(
    request.user!.id,
    "summary_regenerate",
    REGENERATE_LIMIT_PER_HOUR,
    ONE_HOUR_MS,
  );

  // Synchronous: a single Haiku call over one document's extracted text
  // comfortably finishes within a normal request timeout, so there's no
  // need for the async-job complexity the initial upload trigger uses.
  await summarizer.summarizeDocument(doc);
  const updated = await document.findOneById(documentId, request.user!.id);

  return response.status(200).json({
    summary: updated.ai_summary,
    generated_at: updated.ai_summary_generated_at,
  });
}
