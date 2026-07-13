import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import {
  validate,
  shareLinkCreateSchema,
} from "../../../../../../infra/schemas";
import document from "../../../../../../models/document";
import shareLink from "../../../../../../models/shareLink";
import type {
  AuthenticatedNextApiRequest,
  ShareLinkCreateInput,
  ShareLinkResponse,
} from "../../../../../../types/index";

interface DocumentLinksRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: DocumentLinksRequest,
  response: NextApiResponse<ShareLinkResponse[]>,
) {
  const documentId = request.query.id as string;

  await document.findOneById(documentId, request.user!.id);

  const links = await shareLink.findAllByDocumentId(documentId);

  return response.status(200).json(links);
}

async function postHandler(
  request: DocumentLinksRequest,
  response: NextApiResponse<ShareLinkResponse>,
) {
  const documentId = request.query.id as string;

  await document.findOneById(documentId, request.user!.id);

  const validated = validate(shareLinkCreateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as ShareLinkCreateInput;

  const newLink = await shareLink.create(documentId, request.user!.id, input);

  return response.status(201).json(newLink);
}
