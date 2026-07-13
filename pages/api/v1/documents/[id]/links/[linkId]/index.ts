import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import {
  validate,
  shareLinkUpdateSchema,
} from "../../../../../../../infra/schemas";
import document from "../../../../../../../models/document";
import shareLink from "../../../../../../../models/shareLink";
import type {
  AuthenticatedNextApiRequest,
  ShareLinkResponse,
  ShareLinkUpdateInput,
} from "../../../../../../../types/index";

interface LinkRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
    linkId?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: LinkRequest,
  response: NextApiResponse<ShareLinkResponse>,
) {
  const documentId = request.query.id as string;
  const linkId = request.query.linkId as string;

  await document.findOneById(documentId, request.user!.id);

  const validated = validate(shareLinkUpdateSchema, request.body);
  const updateInput = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as ShareLinkUpdateInput;

  const updatedLink = await shareLink.updateById(
    linkId,
    documentId,
    updateInput,
  );

  return response.status(200).json(updatedLink);
}

async function deleteHandler(
  request: LinkRequest,
  response: NextApiResponse<ShareLinkResponse>,
) {
  const documentId = request.query.id as string;
  const linkId = request.query.linkId as string;

  await document.findOneById(documentId, request.user!.id);

  const revokedLink = await shareLink.revokeById(linkId, documentId);

  return response.status(200).json(revokedLink);
}
