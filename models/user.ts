import database from "../infra/database";
import { ValidationError, NotFoundError, ServiceError } from "../infra/errors";
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
          id, username, email, password, created_at, updated_at, deleted_at, is_admin
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
          id, username, email, created_at, updated_at, deleted_at, password, is_admin
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
          id, username, email, created_at, updated_at, is_admin
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

async function runInsertQuery(
  userInputValues: UserCreateInput & { password: string },
): Promise<UserPublic> {
  try {
    const results = await database.query<UserPublic>({
      text: `
        INSERT INTO
          users (username, password, email)
        VALUES
          ($1, $2, $3)
        RETURNING
          id, username, email, created_at, updated_at, is_admin
        ;`,
      values: [
        userInputValues.username,
        userInputValues.password,
        userInputValues.email,
      ],
    });

    return results.rows[0]!;
  } catch (error) {
    throwUniqueViolationAsValidationError(error);
  }
}

// Backstop for the check-then-insert race in validateUniqueEmail/validateUniqueUserName:
// two concurrent requests can both pass the SELECT check before either INSERTs.
// The DB's UNIQUE constraint is the actual source of truth; this just translates
// its violation into the same ValidationError the pre-check would have thrown.
function isUniqueViolation(
  error: unknown,
): error is ServiceError & { cause: { code: string; constraint?: string } } {
  return (
    error instanceof ServiceError &&
    (error.cause as { code?: string } | undefined)?.code === "23505"
  );
}

function throwUniqueViolationAsValidationError(error: unknown): never {
  if (!isUniqueViolation(error)) {
    throw error;
  }

  const constraint = error.cause.constraint;

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

const user: UserModel = {
  create,
  findOneById,
  findOneByUsername,
  findOneByEmail,
  updateByUsername,
  deleteByUsername,
};

export default user;
