import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import {
  validate,
  shareLinkUpdateSchema,
} from "../../../../../../../infra/schemas";
import shareLink from "../../../../../../../models/shareLink";
import type {
  AuthenticatedNextApiRequest,
  ShareLinkPublic,
  ShareLinkUpdateInput,
} from "../../../../../../../types/index";

interface LinkRequest extends AuthenticatedNextApiRequest {
  query: { id?: string; linkId?: string } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: LinkRequest,
  response: NextApiResponse<ShareLinkPublic>,
) {
  const validated = validate(shareLinkUpdateSchema, request.body);

  const input: ShareLinkUpdateInput = {};

  if (validated.label !== undefined) input.label = validated.label;
  if (validated.password !== undefined) input.password = validated.password;
  if (validated.expires_at !== undefined)
    input.expiresAt = validated.expires_at;
  if (validated.allow_download !== undefined)
    input.allowDownload = validated.allow_download;
  if (validated.is_active !== undefined) input.isActive = validated.is_active;

  const updated = await shareLink.updateById(
    request.query.linkId as string,
    request.query.id as string,
    request.user!.id,
    input,
  );

  return response.status(200).json(updated);
}

async function deleteHandler(request: LinkRequest, response: NextApiResponse) {
  await shareLink.deleteById(
    request.query.linkId as string,
    request.query.id as string,
    request.user!.id,
  );

  return response.status(204).end();
}
