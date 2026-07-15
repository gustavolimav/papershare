import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import mailer from "../../../../../../infra/mailer";
import {
  validate,
  linkViewCreateSchema,
} from "../../../../../../infra/schemas";
import linkView from "../../../../../../models/linkView";
import shareLink from "../../../../../../models/shareLink";
import type {
  RecordedLinkView,
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
  response: NextApiResponse<RecordedLinkView>,
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

  if (newView.is_new_viewer) {
    notifyOwnerOfNewViewer(newView.share_link_id, request).catch(
      () => undefined,
    );
  }

  return response.status(201).json(newView);
}

// Fire-and-forget: a notification failure (missing API key, Resend outage,
// deleted owner, ...) must never affect the response to the anonymous
// viewer whose request triggered it.
async function notifyOwnerOfNewViewer(
  shareLinkId: string,
  request: NextApiRequest,
): Promise<void> {
  const info = await shareLink.getNotificationInfo(shareLinkId);

  if (!info || !info.notify_on_view) {
    return;
  }

  await mailer.sendViewNotification({
    to: info.owner_email,
    documentTitle: info.document_title,
    documentId: info.document_id,
    linkLabel: info.link_label,
    analyticsUrl: `${getBaseUrl(request)}/documents/${info.document_id}/analytics`,
  });
}

function getBaseUrl(request: NextApiRequest): string {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  return `${protocol}://${host}`;
}

function extractIpAddress(request: NextApiRequest): string | undefined {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim();
  }

  return request.socket?.remoteAddress ?? undefined;
}
