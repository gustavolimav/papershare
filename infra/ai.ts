import Anthropic from "@anthropic-ai/sdk";
import { ServiceError } from "./errors";

// Cheapest/fastest current model — appropriate for summarization, insight
// generation, and short chat answers, none of which need frontier reasoning.
const MODEL = "claude-haiku-4-5-20251001";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function isAvailable(): boolean {
  return client !== null;
}

// For synchronous, user-initiated features (chat, follow-up email draft)
// where silently doing nothing would be a worse experience than a clear
// error — unlike the fire-and-forget summarization/insights jobs, which
// call `complete()` directly and treat `null` as "skip silently".
function requireAvailable(): void {
  if (!isAvailable()) {
    throw new ServiceError({
      message: "Recurso de IA indisponível no momento.",
      action: "Configure a variável de ambiente ANTHROPIC_API_KEY.",
    });
  }
}

// Fire-and-forget callers (summarization, analytics insights) call this
// directly: it returns null both when the API key is unset and in the test
// environment (mirroring infra/mailer.ts's no-op pattern), so those features
// degrade gracefully instead of throwing.
async function complete(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (process.env.NODE_ENV === "test" || !client) {
    return null;
  }

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
// Callers must check `requireAvailable()` first; this never no-ops.
function stream(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}) {
  requireAvailable();

  return client!.messages.stream({
    model: MODEL,
    max_tokens: params.maxTokens ?? 1024,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });
}

const ai = {
  isAvailable,
  requireAvailable,
  complete,
  stream,
};

export default ai;
