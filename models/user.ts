import database from "../infra/database";
import { ValidationError, NotFoundError, ServiceError } from "../infra/errors";
import { encrypt, decrypt } from "../infra/encryption";
import password from "./password";
import type {
  User,
  UserPublic,
  UserCreateInput,
  UserUpdateInput,
  UserModel,
} from "../types/index";

async function create(userInputValues: UserCreateInput): Promise<UserPublic> {
  await validateUniqueEmail(userInputValues.email);
  await validateUniqueUserName(userInputValues.username);

  await hashPasswordInObject(
    userInputValues as UserCreateInput & { password: string },
  );

  const newUser = await runInsertQuery(
    userInputValues as UserCreateInput & { password: string },
  );

  return newUser;
}

async function findOneByEmail(email: string): Promise<User> {
  const results = await database.query<User>({
    text: `
        SELECT
          *
        FROM
          users
        WHERE
          LOWER(email) = LOWER($1)
          AND deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [email],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: "O email informado não foi encontrado no sistema.",
      action: "Verifique se o email está digitado corretamente.",
    });
  }

  return results.rows[0]!;
}

async function findOneById(id: string): Promise<User> {
  const results = await database.query<User>({
    text: `
        SELECT
          id, username, email, password, created_at, updated_at, deleted_at, is_superadmin,
          active_workspace_id
        FROM
          users
        WHERE
          id = $1
          AND deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [id],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: "O usuário informado não foi encontrado no sistema.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return results.rows[0]!;
}

async function findOneByUsername(username: string): Promise<User> {
  const results = await database.query<User>({
    text: `
        SELECT
          id, username, email, created_at, updated_at, deleted_at, password, is_superadmin,
          active_workspace_id
        FROM
          users
        WHERE
          LOWER(username) = LOWER($1)
          AND deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [username],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: "O username informado não foi encontrado no sistema.",
      action: "Verifique se o username está digitado corretamente.",
    });
  }

  return results.rows[0]!;
}

async function updateByUsername(
  username: string,
  userInputValues: UserUpdateInput,
): Promise<UserPublic> {
  const currentUser = await findOneByUsername(username);

  if ("email" in userInputValues && userInputValues.email) {
    await validateUniqueEmail(userInputValues.email);
  }

  if ("username" in userInputValues && userInputValues.username) {
    await validateUniqueUserName(userInputValues.username);
  }

  if ("password" in userInputValues && userInputValues.password) {
    await hashPasswordInObject(
      userInputValues as UserUpdateInput & { password: string },
    );
  }

  const userToBeUpdated = {
    ...currentUser,
    ...userInputValues,
  };

  const updatedUser = await runUpdateQuery(userToBeUpdated, username);

  if (!updatedUser.rowCount || updatedUser.rowCount === 0) {
    throw new NotFoundError({
      message: "O username informado não foi encontrado no sistema.",
      action: "Verifique se o username está digitado corretamente.",
    });
  }

  return updatedUser.rows[0]!;
}

async function validateUniqueEmail(email: string): Promise<void> {
  const results = await database.query({
    text: `
        SELECT 
          email
        FROM 
          users
        WHERE 
          LOWER(email) = LOWER($1)
        ;`,
    values: [email],
  });

  if (results.rowCount && results.rowCount > 0) {
    throw new ValidationError({
      message: "O email informado já está sendo utilizado.",
      action: "Utilize outro email para realizar esta operação.",
    });
  }
}

async function validateUniqueUserName(userName: string): Promise<void> {
  const results = await database.query({
    text: `
        SELECT 
          username
        FROM 
          users
        WHERE 
          LOWER(username) = LOWER($1)
        ;`,
    values: [userName],
  });

  if (results.rowCount && results.rowCount > 0) {
    throw new ValidationError({
      action: "Utilize outro username para realizar esta operação.",
      message: "O username informado já está sendo utilizado.",
    });
  }
}

async function hashPasswordInObject(userInputValues: {
  password: string;
}): Promise<void> {
  const hashedPassword = await password.hash(userInputValues.password);

  userInputValues.password = hashedPassword;
}

async function runUpdateQuery(userWithNewValues: User, username: string) {
  try {
    return await database.query<UserPublic>({
      text: `
        UPDATE
          users
        SET
          username = $1,
          password = $2,
          email = $3,
          updated_at = NOW()
        WHERE
          LOWER(username) = LOWER($4)
        RETURNING
          id, username, email, created_at, updated_at, is_superadmin,
          active_workspace_id
        ;`,
      values: [
        userWithNewValues.username,
        userWithNewValues.password,
        userWithNewValues.email,
        username,
      ],
    });
  } catch (error) {
    throwUniqueViolationAsValidationError(error);
  }
}

// Also creates the user's personal workspace + owner membership + active
// workspace pointer, atomically with the user row itself — a user with no
// personal workspace is a broken state, so this all happens in one
// transaction on a dedicated client rather than the shared pool.
async function runInsertQuery(
  userInputValues: UserCreateInput & { password: string },
): Promise<UserPublic> {
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    const userResult = await client.query({
      text: `
        INSERT INTO
          users (username, password, email)
        VALUES
          ($1, $2, $3)
        RETURNING
          id, username, email, created_at, updated_at, is_superadmin
        ;`,
      values: [
        userInputValues.username,
        userInputValues.password,
        userInputValues.email,
      ],
    });

    const newUser = userResult.rows[0] as UserPublic;

    const workspaceResult = await client.query({
      text: `
        INSERT INTO
          workspaces (name, created_by, is_personal)
        VALUES
          ($1, $2, true)
        RETURNING
          id
        ;`,
      values: [newUser.username, newUser.id],
    });

    const workspaceId = (workspaceResult.rows[0] as { id: string }).id;

    await client.query({
      text: `
        INSERT INTO
          workspace_members (workspace_id, user_id, role)
        VALUES
          ($1, $2, 'owner')
        ;`,
      values: [workspaceId, newUser.id],
    });

    await client.query({
      text: `
        UPDATE
          users
        SET
          active_workspace_id = $1
        WHERE
          id = $2
        ;`,
      values: [workspaceId, newUser.id],
    });

    await client.query("COMMIT");

    // newUser.active_workspace_id is still null from the INSERT above —
    // the UPDATE that sets it happens afterward in this same transaction.
    return { ...newUser, active_workspace_id: workspaceId };
  } catch (error) {
    await client.query("ROLLBACK");
    throwUniqueViolationAsValidationError(error);
  } finally {
    await client.end();
  }
}

// Backstop for the check-then-insert race in validateUniqueEmail/validateUniqueUserName:
// two concurrent requests can both pass the SELECT check before either INSERTs.
// The DB's UNIQUE constraint is the actual source of truth; this just translates
// its violation into the same ValidationError the pre-check would have thrown.
//
// Two error shapes are handled here: a raw pg error (thrown by the dedicated
// transaction client in runInsertQuery, which bypasses infra/database.ts's
// pool wrapper) and a ServiceError-wrapped one (thrown via database.query()'s
// pool, used by runUpdateQuery below).
function isUniqueViolation(
  error: unknown,
): error is { code: string; constraint?: string } {
  if (error instanceof ServiceError) {
    return (error.cause as { code?: string } | undefined)?.code === "23505";
  }

  return (error as { code?: string } | undefined)?.code === "23505";
}

function throwUniqueViolationAsValidationError(error: unknown): never {
  if (!isUniqueViolation(error)) {
    throw error;
  }

  const constraint =
    error instanceof ServiceError
      ? (error.cause as { constraint?: string }).constraint
      : (error as { constraint?: string }).constraint;

  if (constraint === "users_email_key") {
    throw new ValidationError({
      message: "O email informado já está sendo utilizado.",
      action: "Utilize outro email para realizar esta operação.",
    });
  }

  if (constraint === "users_username_key") {
    throw new ValidationError({
      message: "O username informado já está sendo utilizado.",
      action: "Utilize outro username para realizar esta operação.",
    });
  }

  throw error;
}

async function deleteByUsername(username: string): Promise<void> {
  await database.query({
    text: `
        UPDATE
          users
        SET
          deleted_at = NOW()
        WHERE
          LOWER(username) = LOWER($1)
          AND deleted_at IS NULL
        ;`,
    values: [username],
  });
}

// Bring-your-own-key: every AI feature runs against the document owner's
// own Anthropic key rather than one the platform pays for. Encrypted at
// rest (infra/encryption.ts) since, unlike a password, this must be
// recoverable to actually call the Anthropic API.
async function setAiApiKey(
  userId: string,
  apiKey: string | null,
): Promise<void> {
  await database.query({
    text: `
        UPDATE
          users
        SET
          ai_api_key_encrypted = $1,
          updated_at = NOW()
        WHERE
          id = $2
        ;`,
    values: [apiKey ? encrypt(apiKey) : null, userId],
  });
}

async function hasAiApiKey(userId: string): Promise<boolean> {
  const results = await database.query<{
    ai_api_key_encrypted: string | null;
  }>({
    text: `
        SELECT
          ai_api_key_encrypted
        FROM
          users
        WHERE
          id = $1
        ;`,
    values: [userId],
  });

  return !!results.rows[0]?.ai_api_key_encrypted;
}

async function getAiApiKey(userId: string): Promise<string | null> {
  const results = await database.query<{
    ai_api_key_encrypted: string | null;
  }>({
    text: `
        SELECT
          ai_api_key_encrypted
        FROM
          users
        WHERE
          id = $1
        ;`,
    values: [userId],
  });

  const encrypted = results.rows[0]?.ai_api_key_encrypted;

  return encrypted ? decrypt(encrypted) : null;
}

const user: UserModel = {
  create,
  findOneById,
  findOneByUsername,
  findOneByEmail,
  updateByUsername,
  deleteByUsername,
  setAiApiKey,
  hasAiApiKey,
  getAiApiKey,
};

export default user;
