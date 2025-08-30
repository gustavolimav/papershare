import database from '../infra/database.ts';
import { ValidationError, NotFoundError } from '../infra/errors.ts';
import password from './password.ts';
import type { 
  User, 
  UserPublic, 
  UserCreateInput, 
  UserUpdateInput, 
  UserModel 
} from '../types/index.ts';

async function create(userInputValues: UserCreateInput): Promise<UserPublic> {
  await validateUniqueEmail(userInputValues.email);
  await validateUniqueUserName(userInputValues.username);

  await hashPasswordInObject(userInputValues as UserCreateInput & { password: string });

  const newUser = await runInsertQuery(userInputValues as UserCreateInput & { password: string });

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
        LIMIT
          1
        ;`,
    values: [email],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: 'O email informado não foi encontrado no sistema.',
      action: 'Verifique se o email está digitado corretamente.',
    });
  }

  return results.rows[0]!;
}

async function findOneByUsername(username: string): Promise<User> {
  const results = await database.query<User>({
    text: `
        SELECT 
          id, username, email, created_at, updated_at, password
        FROM 
          users
        WHERE 
          LOWER(username) = LOWER($1)
        LIMIT
          1
        ;`,
    values: [username],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: 'O username informado não foi encontrado no sistema.',
      action: 'Verifique se o username está digitado corretamente.',
    });
  }

  return results.rows[0]!;
}

async function updateByUsername(username: string, userInputValues: UserUpdateInput): Promise<UserPublic> {
  const currentUser = await findOneByUsername(username);

  if ('email' in userInputValues && userInputValues.email) {
    await validateUniqueEmail(userInputValues.email);
  }

  if ('username' in userInputValues && userInputValues.username) {
    await validateUniqueUserName(userInputValues.username);
  }

  if ('password' in userInputValues && userInputValues.password) {
    await hashPasswordInObject(userInputValues as UserUpdateInput & { password: string });
  }

  const userToBeUpdated = {
    ...currentUser,
    ...userInputValues,
  };

  const updatedUser = await runUpdateQuery(userToBeUpdated, username);

  if (!updatedUser.rowCount || updatedUser.rowCount === 0) {
    throw new NotFoundError({
      message: 'O username informado não foi encontrado no sistema.',
      action: 'Verifique se o username está digitado corretamente.',
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
      message: 'O email informado já está sendo utilizado.',
      action: 'Utilize outro email para realizar esta operação.',
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
      action: 'Utilize outro username para realizar esta operação.',
      message: 'O username informado já está sendo utilizado.',
    });
  }
}

async function hashPasswordInObject(userInputValues: { password: string }): Promise<void> {
  const hashedPassword = await password.hash(userInputValues.password);

  userInputValues.password = hashedPassword;
}

async function runUpdateQuery(userWithNewValues: User, username: string) {
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
          id, username, email, created_at, updated_at
        ;`,
    values: [
      userWithNewValues.username,
      userWithNewValues.password,
      userWithNewValues.email,
      username,
    ],
  });
}

async function runInsertQuery(userInputValues: UserCreateInput & { password: string }): Promise<UserPublic> {
  const results = await database.query<UserPublic>({
    text: `
        INSERT INTO 
          users (username, password, email) 
        VALUES 
          ($1, $2, $3)
        RETURNING
          id, username, email, created_at, updated_at
        ;`,
    values: [
      userInputValues.username,
      userInputValues.password,
      userInputValues.email,
    ],
  });

  return results.rows[0]!;
}

const user: UserModel = {
  create,
  findOneByUsername,
  findOneByEmail,
  updateByUsername,
};

export default user;
