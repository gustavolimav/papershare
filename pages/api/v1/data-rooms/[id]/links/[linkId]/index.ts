import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import {
  validate,
  dataRoomLinkUpdateSchema,
} from "../../../../../../../infra/schemas";
import dataRoomLink from "../../../../../../../models/dataRoomLink";
import type {
  AuthenticatedNextApiRequest,
  DataRoomLinkResponse,
  DataRoomLinkUpdateInput,
} from "../../../../../../../types/index";

interface DataRoomLinkRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
    linkId?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(
  request: DataRoomLinkRequest,
  response: NextApiResponse<DataRoomLinkResponse>,
) {
  const dataRoomId = request.query.id as string;
  const linkId = request.query.linkId as string;
  const validated = validate(dataRoomLinkUpdateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DataRoomLinkUpdateInput;

  const updatedLink = await dataRoomLink.updateById(
    linkId,
    dataRoomId,
    request.user!.id,
    input,
  );

  return response.status(200).json(updatedLink);
}
