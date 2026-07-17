import type { NextApiRequest, NextApiResponse } from "next";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  PaymentRequiredError,
  ServiceError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

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

  if (err instanceof UnauthorizedError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof ForbiddenError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof ConflictError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof PaymentRequiredError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof TooManyRequestsError) {
    response.status(err.statusCode).json(err);
    return;
  }

  if (err instanceof ServiceError) {
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
