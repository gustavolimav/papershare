import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import {
  validate,
  shareLinkCreateSchema,
} from "../../../../../../infra/schemas";
import shareLink from "../../../../../../models/shareLink";
import type {
  AuthenticatedNextApiRequest,
  ShareLinkPublic,
  ShareLinkCreateInput,
} from "../../../../../../types/index";

interface LinksRequest extends AuthenticatedNextApiRequest {
  query: { id?: string } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(listHandler);
router.post(createHandler);

export default router.handler(controller.errorHandlers);

async function listHandler(
  request: LinksRequest,
  response: NextApiResponse<ShareLinkPublic[]>,
) {
  const links = await shareLink.findAllByDocumentId(
    request.query.id as string,
    request.user!.id,
  );

  return response.status(200).json(links);
}

async function createHandler(
  request: LinksRequest,
  response: NextApiResponse<ShareLinkPublic>,
) {
  const validated = validate(shareLinkCreateSchema, request.body);

  const input: ShareLinkCreateInput = {
    documentId: request.query.id as string,
    userId: request.user!.id,
    ...(validated.label !== undefined && { label: validated.label }),
    ...(validated.password !== undefined && { password: validated.password }),
    ...(validated.expires_at !== undefined && {
      expiresAt: validated.expires_at,
    }),
    ...(validated.allow_download !== undefined && {
      allowDownload: validated.allow_download,
    }),
  };

  const link = await shareLink.create(input);

  return response.status(201).json(link);
}
