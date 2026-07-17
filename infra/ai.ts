import Anthropic from "@anthropic-ai/sdk";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import { ServiceError } from "./errors";

// Cheapest/fastest current model — appropriate for summarization, insight
// generation, and short chat answers, none of which need frontier reasoning.
const MODEL = "claude-haiku-4-5-20251001";

// Bring-your-own-key: there is no platform-wide Anthropic client. Every
// caller resolves the specific document owner's key (models/user.ts's
// getAiApiKey) and passes it in explicitly — a fresh client per call is
// cheap enough (no persistent connection) that caching isn't worth the
// complexity.
function getClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// For synchronous, user-initiated features (chat, follow-up email draft)
// where silently doing nothing would be a worse experience than a clear
// error — unlike the fire-and-forget summarization/insights jobs, which
// call `complete()` directly and treat `null` as "skip silently".
function requireApiKey(apiKey: string | null): asserts apiKey is string {
  if (!apiKey) {
    throw new ServiceError({
      message: "Recurso de IA indisponível no momento.",
      action:
        "Peça para o dono do documento configurar sua chave de IA em Configurações.",
    });
  }
}

// Fire-and-forget callers (summarization, analytics insights) call this
// directly: a null apiKey (owner hasn't configured one) makes it return
// null instead of throwing, so those features degrade gracefully.
async function complete(params: {
  apiKey: string | null;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (!params.apiKey) {
    return null;
  }

  const client = getClient(params.apiKey);
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : null;
}

// Streaming variant for the RAG viewer chat (US-16) — the only feature that
// needs a token-by-token response instead of a single completed string.
// Callers must check `requireApiKey()` first; this never no-ops.
function stream(params: {
  apiKey: string | null;
  system: string;
  prompt: string;
  maxTokens?: number;
}) {
  requireApiKey(params.apiKey);

  const client = getClient(params.apiKey);
  return client.messages.stream({
    model: MODEL,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });
}

interface AiModel {
  requireApiKey(apiKey: string | null): asserts apiKey is string;
  complete(params: {
    apiKey: string | null;
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string | null>;
  stream(params: {
    apiKey: string | null;
    system: string;
    prompt: string;
    maxTokens?: number;
  }): MessageStream;
}

const ai: AiModel = {
  requireApiKey,
  complete,
  stream,
};

export default ai;
