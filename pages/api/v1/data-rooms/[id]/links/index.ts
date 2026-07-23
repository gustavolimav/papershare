import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import {
  validate,
  dataRoomLinkCreateSchema,
} from "../../../../../../infra/schemas";
import dataRoomLink from "../../../../../../models/dataRoomLink";
import type {
  AuthenticatedNextApiRequest,
  DataRoomLinkCreateInput,
  DataRoomLinkResponse,
} from "../../../../../../types/index";

interface DataRoomLinksRequest extends AuthenticatedNextApiRequest {
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
  request: DataRoomLinksRequest,
  response: NextApiResponse<DataRoomLinkResponse[]>,
) {
  const dataRoomId = request.query.id as string;

  const links = await dataRoomLink.findAllByDataRoomId(
    dataRoomId,
    request.user!.id,
  );

  return response.status(200).json(links);
}

async function postHandler(
  request: DataRoomLinksRequest,
  response: NextApiResponse<DataRoomLinkResponse>,
) {
  const dataRoomId = request.query.id as string;
  const validated = validate(dataRoomLinkCreateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DataRoomLinkCreateInput;

  const newLink = await dataRoomLink.create(
    dataRoomId,
    request.user!.id,
    input,
  );

  return response.status(201).json(newLink);
}
