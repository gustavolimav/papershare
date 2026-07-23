import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import { authMiddleware } from "../../../../../infra/auth";
import { validate, dataRoomUpdateSchema } from "../../../../../infra/schemas";
import dataRoom from "../../../../../models/dataRoom";
import type {
  AuthenticatedNextApiRequest,
  DataRoomResponse,
  DataRoomUpdateInput,
} from "../../../../../types/index";

interface DataRoomRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: DataRoomRequest,
  response: NextApiResponse<DataRoomResponse>,
) {
  const id = request.query.id as string;

  const room = await dataRoom.findOneById(id, request.user!.id);

  return response.status(200).json(room);
}

async function patchHandler(
  request: DataRoomRequest,
  response: NextApiResponse<DataRoomResponse>,
) {
  const id = request.query.id as string;
  const validated = validate(dataRoomUpdateSchema, request.body);
  const input = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as DataRoomUpdateInput;

  const updatedRoom = await dataRoom.updateById(id, request.user!.id, input);

  return response.status(200).json(updatedRoom);
}

async function deleteHandler(
  request: DataRoomRequest,
  response: NextApiResponse<void>,
) {
  const id = request.query.id as string;

  await dataRoom.deleteById(id, request.user!.id);

  return response.status(204).end();
}
