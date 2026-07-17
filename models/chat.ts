import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import ai from "../infra/ai";
import { ValidationError } from "../infra/errors";
import documentChunks from "./documentChunks";

function buildPrompt(
  question: string,
  chunks: { page_number: number; content: string }[],
): { system: string; prompt: string } {
  const excerpts = chunks
    .map((chunk) => `[Página ${chunk.page_number}]\n${chunk.content}`)
    .join("\n\n---\n\n");

  return {
    system:
      "Você é um assistente que responde perguntas sobre um documento, com base apenas nos trechos fornecidos. Se a resposta não estiver nos trechos, diga que não encontrou essa informação no documento — nunca invente. Responda em português do Brasil. Sempre que possível, cite a página de onde veio a informação (ex: 'Baseado na página 3...').",
    prompt: `Trechos do documento:\n\n${excerpts}\n\nPergunta do visitante: ${question}`,
  };
}

// Requires the caller to have already validated the share link (password/
// email/NDA gates) — this only handles the RAG lookup and the streaming
// Claude call, same separation as the rest of the public share routes.
async function answerQuestion(
  documentId: string,
  question: string,
): Promise<MessageStream> {
  ai.requireAvailable();

  const allChunks = await documentChunks.ensureChunks(documentId);

  if (allChunks.length === 0) {
    throw new ValidationError({
      message: "O chat não está disponível para este documento.",
      action:
        "Este recurso funciona apenas com documentos PDF processados com sucesso.",
    });
  }

  const relevant = documentChunks.findRelevantChunks(allChunks, question);
  const { system, prompt } = buildPrompt(question, relevant);

  return ai.stream({ system, prompt, maxTokens: 1024 });
}

const chat = { answerQuestion };

export default chat;
