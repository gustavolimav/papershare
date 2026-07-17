import ai from "../infra/ai";
import { NotFoundError, ServiceError } from "../infra/errors";
import document from "./document";
import shareLink from "./shareLink";
import linkView from "./linkView";
import aiUsage from "./aiUsage";
import type { FollowUpEmailSuggestion } from "../types/index";

const ONE_HOUR_MS = 60 * 60 * 1000;
// Generous relative to the other AI rate limits — this is a manual, one-off
// action per viewer an owner reviews before sending, not something a UI
// could loop over automatically the way insight/summary regeneration might.
const LIMIT_PER_HOUR = 20;

async function generateSuggestion(
  documentId: string,
  linkId: string,
  userId: string,
  viewerFingerprint: string,
): Promise<FollowUpEmailSuggestion> {
  // Ownership/existence checks always run first, regardless of whether the
  // AI client is configured — otherwise a caller with no valid credentials
  // would get the same 503 as a legitimate owner, leaking nothing useful
  // but also masking a real 403/404 behind an unrelated error.
  const doc = await document.findOneById(documentId, userId);
  await shareLink.findOneById(linkId, documentId);

  const viewer = await linkView.getViewerByFingerprint(
    linkId,
    viewerFingerprint,
    doc.page_count,
  );

  if (!viewer) {
    throw new NotFoundError({
      message:
        "Nenhuma visualização encontrada para este visitante neste link.",
      action: "Verifique se o identificador do visitante está correto.",
    });
  }

  await aiUsage.checkAndRecord(
    userId,
    "followup_email",
    LIMIT_PER_HOUR,
    ONE_HOUR_MS,
  );

  // Synchronous, user-initiated action — a missing API key should surface
  // as a clear error, not a silent no-op like the fire-and-forget
  // summarization/insights jobs. Checked last, right before the actual call.
  ai.requireAvailable();

  const data = JSON.stringify({
    document_title: doc.title,
    viewer_name: viewer.viewer_name,
    viewer_email: viewer.viewer_email,
    engagement_score: viewer.engagement_score,
    total_time_on_page_seconds: viewer.total_time_on_page,
    max_pages_viewed: viewer.max_pages_viewed,
    page_count: doc.page_count,
    visit_count: viewer.visit_count,
    downloaded: viewer.downloaded,
  });

  const raw = await ai.complete({
    system:
      'Você é um assistente que ajuda donos de documentos a escrever e-mails de follow-up curtos e naturais, em português do Brasil, baseados em dados reais de engajamento do leitor. Nunca invente informações que não estão nos dados fornecidos. Cite pelo menos um dado concreto (ex: até qual página leu, se baixou o arquivo, quantas vezes visitou). Responda como JSON válido e apenas o JSON, no formato exato: {"subject": string, "body": string}.',
    prompt: `Dados de engajamento do visitante:\n\n${data}`,
    maxTokens: 512,
  });

  if (!raw) {
    throw new ServiceError({
      message: "Recurso de IA indisponível no momento.",
      action: "Tente novamente em instantes.",
    });
  }

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
      throw new Error("malformed response");
    }

    return {
      subject: parsed.subject,
      body: parsed.body,
      viewer_email: viewer.viewer_email,
    };
  } catch {
    throw new ServiceError({
      message: "Não foi possível gerar a sugestão de e-mail.",
      action: "Tente novamente em instantes.",
    });
  }
}

const followupEmail = { generateSuggestion };

export default followupEmail;
