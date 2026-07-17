import type { NextApiRequest, NextApiResponse } from "next";
import * as cookie from "cookie";
import session from "../models/session";
import database from "./database";
import { UnauthorizedError } from "./errors";
import type { AuthenticatedNextApiRequest, User } from "../types/index";

export async function authMiddleware(
  request: NextApiRequest,
  response: NextApiResponse,
  next: () => void | Promise<void>,
): Promise<void> {
  const cookies = cookie.parse(request.headers.cookie ?? "");
  const sessionToken = cookies.session_id;

  if (!sessionToken) {
    throw new UnauthorizedError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  const existingSession = await session.findOneByToken(sessionToken);

  if (!existingSession) {
    clearSessionCookie(response);
    throw new UnauthorizedError({
      message: "Sessão não encontrada ou inválida.",
      action: "Faça login novamente para continuar.",
    });
  }

  const isExpired = new Date(existingSession.expires_at) < new Date();

  if (isExpired) {
    await session.deleteByToken(sessionToken);
    clearSessionCookie(response);
    throw new UnauthorizedError({
      message: "Sessão expirada.",
      action: "Faça login novamente para continuar.",
    });
  }

  const authenticatedUser = await findUserById(existingSession.user_id);

  (request as AuthenticatedNextApiRequest).user = authenticatedUser;
  (request as AuthenticatedNextApiRequest).session = existingSession;

  await next();
}

async function findUserById(userId: string): Promise<User> {
  const results = await database.query<User>({
    text: `
        SELECT
          id, username, email, password, created_at, updated_at, is_superadmin,
          active_workspace_id
        FROM
          users
        WHERE
          id = $1
        LIMIT
          1
        ;`,
    values: [userId],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new UnauthorizedError({
      message: "Usuário da sessão não encontrado.",
      action: "Faça login novamente para continuar.",
    });
  }

  return results.rows[0]!;
}

function clearSessionCookie(response: NextApiResponse): void {
  const expiredCookie = cookie.serialize("session_id", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  response.setHeader("Set-Cookie", expiredCookie);
}

// Accepts either the shared secret header (scripts/CI) or a logged-in
// superadmin session (the /superadmin/migrations UI) — whichever is present.
export async function migrationsAuthMiddleware(
  request: NextApiRequest,
  _response: NextApiResponse,
  next: () => void | Promise<void>,
): Promise<void> {
  const providedSecret = request.headers["x-migrations-secret"];
  const expectedSecret = process.env.MIGRATIONS_SECRET;

  if (expectedSecret && providedSecret === expectedSecret) {
    await next();
    return;
  }

  if (await isAuthenticatedAsSuperadmin(request)) {
    await next();
    return;
  }

  throw new UnauthorizedError({
    message: "Acesso não autorizado às migrações.",
    action:
      "Forneça o cabeçalho 'x-migrations-secret' correto ou acesse com uma conta de superadmin.",
  });
}

async function isAuthenticatedAsSuperadmin(
  request: NextApiRequest,
): Promise<boolean> {
  const cookies = cookie.parse(request.headers.cookie ?? "");
  const sessionToken = cookies.session_id;

  if (!sessionToken) {
    return false;
  }

  const existingSession = await session.findOneByToken(sessionToken);

  if (!existingSession || new Date(existingSession.expires_at) < new Date()) {
    return false;
  }

  const results = await database.query<{ is_superadmin: boolean }>({
    text: `
        SELECT
          is_superadmin
        FROM
          users
        WHERE
          id = $1
        LIMIT
          1
        ;`,
    values: [existingSession.user_id],
  });

  return results.rows[0]?.is_superadmin === true;
}
