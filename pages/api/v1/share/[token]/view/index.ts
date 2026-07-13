import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import {
  validate,
  linkViewCreateSchema,
} from "../../../../../../infra/schemas";
import linkView from "../../../../../../models/linkView";
import type {
  LinkView,
  LinkViewCreateInput,
} from "../../../../../../types/index";

interface ViewRequest extends NextApiRequest {
  query: {
    token?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: ViewRequest,
  response: NextApiResponse<LinkView>,
) {
  const token = request.query.token as string;

  const validated = validate(linkViewCreateSchema, request.body);
  const ipAddress = extractIpAddress(request);
  const userAgent = request.headers["user-agent"];

  const input: LinkViewCreateInput = {
    ...(validated.viewer_fingerprint !== undefined && {
      viewer_fingerprint: validated.viewer_fingerprint,
    }),
    ...(validated.time_on_page !== undefined && {
      time_on_page: validated.time_on_page,
    }),
    ...(validated.pages_viewed !== undefined && {
      pages_viewed: validated.pages_viewed,
    }),
    ...(ipAddress !== undefined && { ip_address: ipAddress }),
    ...(typeof userAgent === "string" && { user_agent: userAgent }),
  };

  const newView = await linkView.recordView(token, input);

  return response.status(201).json(newView);
}

function extractIpAddress(request: NextApiRequest): string | undefined {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim();
  }

  return request.socket?.remoteAddress ?? undefined;
}
