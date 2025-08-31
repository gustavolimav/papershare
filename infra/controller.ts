import type { NextApiRequest, NextApiResponse } from "next";
import {
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  UnathorizedError,
  ValidationError,
} from "./errors.ts";

function onNoMatchHandler(
  request: NextApiRequest,
  response: NextApiResponse,
): void {
  const publicErrorObject = new MethodNotAllowedError();

  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(
  error: unknown,
  request: NextApiRequest,
  response: NextApiResponse,
): void {
  const err = error as Error;
  if (err instanceof ValidationError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof NotFoundError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof UnathorizedError) {
    response.status(err.statusCode).json(err);
    return;
  }

  const publicErrorObject = new InternalServerError({
    statusCode: (err as any).statusCode,
    cause: err,
  });

  console.error(publicErrorObject);

  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
};

export default controller;
