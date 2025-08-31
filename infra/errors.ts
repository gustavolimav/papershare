import type { ErrorConstructorOptions } from "../types/index.js";

export class InternalServerError extends Error {
  public readonly name = "InternalServerError";
  public readonly action: string;
  public readonly statusCode: number;

  constructor({ cause, statusCode }: ErrorConstructorOptions = {}) {
    super("Um erro interno não esperado aconteceu.", {
      cause,
    });
    this.action = "Entre em contato com o suporte.";
    this.statusCode = statusCode || 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}

export class ServiceError extends Error {
  public readonly name = "ServiceError";
  public readonly action: string;
  public readonly statusCode = 503;

  constructor({ cause, message }: ErrorConstructorOptions = {}) {
    super(message || "Serviço indisponível no momento.", {
      cause,
    });
    this.action = "Verifique se o serviço está disponível.";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}

export class ValidationError extends Error {
  public readonly name = "ValidationError";
  public readonly action: string;
  public readonly statusCode = 400;

  constructor({ message, action }: ErrorConstructorOptions = {}) {
    super(message || "A validation error occurred.");
    this.action = action || "Check the provided data.";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}

export class NotFoundError extends Error {
  public readonly name = "NotFoundError";
  public readonly action: string;
  public readonly statusCode = 404;

  constructor({ cause, message, action }: ErrorConstructorOptions = {}) {
    super(message || "Nenhum recurso foi encontrado.", {
      cause,
    });
    this.action = action || "Verfique se os parametros estão corretos.";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}

export class MethodNotAllowedError extends Error {
  public readonly name = "MethodNotAllowedError";
  public readonly action =
    "Please check the API documentation for the correct usage.";
  public readonly message = "Method Not Allowed";
  public readonly statusCode = 405;

  constructor() {
    super("Method Not Allowed");
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}

export class UnathorizedError extends Error {
  public readonly name = "UnathorizedError";
  public readonly action: string;
  public readonly statusCode = 401;

  constructor({ cause, message, action }: ErrorConstructorOptions = {}) {
    super(message || "Usuário não autenticado.", {
      cause,
    });
    this.action = action || "Faça login para realizar esta operação.";
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status: this.statusCode,
    };
  }
}
