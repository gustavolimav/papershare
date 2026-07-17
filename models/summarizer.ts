import storage from "../infra/storage";
import ai from "../infra/ai";
import document from "./document";
import user from "./user";
import { extractText } from "./textExtraction";
import type { DocumentResponse } from "../types/index";

// ~10k tokens of context — long enough for almost any real-world document,
// short enough to keep a single summarization call cheap and fast.
const MAX_PROMPT_CHARS = 40000;

// Leaves ai_summary untouched (null, or whatever it already was) on any
// failure — extraction not supported for this file type, storage error, or
// the AI client being unavailable/in a test run. Never throws: callers use
// this fire-and-forget after upload, and a failed summary must not affect
// the upload itself.
//
// `fileBuffer` is optional: the upload handler already has the bytes in
// memory and passes them straight through to avoid an extra storage round
// trip; the manual regenerate endpoint doesn't, so it's fetched here.
async function summarizeDocument(
  doc: DocumentResponse,
  fileBuffer?: Buffer,
): Promise<void> {
  try {
    const buffer = fileBuffer ?? (await storage.getFile(doc.storage_key)).body;
    const extracted = await extractText(doc.mime_type, buffer);

    if (!extracted || !extracted.fullText.trim()) {
      return;
    }

    const apiKey = await user.getAiApiKey(doc.user_id);
    const summary = await ai.complete({
      apiKey,
      system:
        "Você resume documentos de forma concisa e objetiva, em 2 a 5 frases. Responda no mesmo idioma do texto original.",
      prompt: `Resuma o seguinte documento em 2 a 5 frases:\n\n${extracted.fullText.slice(0, MAX_PROMPT_CHARS)}`,
    });

    if (!summary) {
      return;
    }

    await document.updateSummary(doc.id, summary.trim());
  } catch {
    // Best-effort background job — extraction/API errors are swallowed
    // rather than surfaced, matching infra/mailer.ts's fire-and-forget
    // notification pattern.
  }
}

const summarizer = { summarizeDocument };

export default summarizer;
