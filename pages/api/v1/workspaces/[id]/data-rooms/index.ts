import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../infra/auth";
import { parsePagination } from "../../../../../../infra/pagination";
import {
  validate,
  dataRoomCreateSchema,
} from "../../../../../../infra/schemas";
import dataRoom from "../../../../../../models/dataRoom";
import type {
  AuthenticatedNextApiRequest,
  DataRoomListResponse,
  DataRoomResponse,
} from "../../../../../../types/index";

interface WorkspaceDataRoomsRequest extends AuthenticatedNextApiRequest {
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
  request: WorkspaceDataRoomsRequest,
  response: NextApiResponse<DataRoomListResponse>,
) {
  const workspaceId = request.query.id as string;
  const pagination = parsePagination(request.query);

  const result = await dataRoom.findAllByWorkspaceId(
    workspaceId,
    request.user!.id,
    pagination,
  );

  return response.status(200).json(result);
}

async function postHandler(
  request: WorkspaceDataRoomsRequest,
  response: NextApiResponse<DataRoomResponse>,
) {
  const workspaceId = request.query.id as string;
  const input = validate(dataRoomCreateSchema, request.body);

  const newRoom = await dataRoom.create(workspaceId, request.user!.id, input);

  return response.status(201).json(newRoom);
}
