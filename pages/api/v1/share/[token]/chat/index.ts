import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { rateLimit } from "../../../../../../infra/rate-limit";
import { validate, chatCreateSchema } from "../../../../../../infra/schemas";
import shareLink from "../../../../../../models/shareLink";
import chat from "../../../../../../models/chat";

interface ChatRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

// Public, like the sibling share routes — gated the same way (password/
// email/NDA) via shareLink.getByToken below, not by auth middleware.
// Rate-limited the same way too, to protect both brute-forcing and AI cost.
router.post(rateLimit({ limit: 20, windowMs: 60 * 60 * 1000 }), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request: ChatRequest, response: NextApiResponse) {
  const token = request.query.token as string;
  const { question } = validate(chatCreateSchema, request.body);

  const providedPassword = request.headers["x-share-password"];
  const providedEmail = request.headers["x-viewer-email"];
  const providedName = request.headers["x-viewer-name"];

  const result = await shareLink.getByToken(
    token,
    typeof providedPassword === "string" ? providedPassword : undefined,
    typeof providedEmail === "string" ? providedEmail : undefined,
    typeof providedName === "string" ? providedName : undefined,
  );

  const messageStream = await chat.answerQuestion(result.document.id, question);

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  messageStream.on("text", (textDelta: string) => {
    response.write(`data: ${JSON.stringify({ text: textDelta })}\n\n`);
  });

  messageStream.on("end", () => {
    response.write("data: [DONE]\n\n");
    response.end();
  });

  messageStream.on("error", () => {
    response.write(
      `data: ${JSON.stringify({ error: "Erro ao gerar resposta." })}\n\n`,
    );
    response.end();
  });
}
