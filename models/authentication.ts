import user from "./user";
import password from "./password";
import { NotFoundError, UnathorizedError } from "../infra/errors";
import type { User, AuthenticationModel } from "../types/index";

async function getAuthentication(
  providedEmail: string,
  providedPassword: string,
): Promise<User> {
  let storedUser: User;

  try {
    storedUser = await findUserByEmail(providedEmail);

    await validatePassword(providedPassword, storedUser.password);
  } catch (error) {
    if (error instanceof UnathorizedError) {
      throw new UnathorizedError({
        message: "Email ou senha inválidos.",
        action: "Verifique se o email e a senha estão digitados corretamente.",
      });
    }

    throw error;
  }

  return storedUser;
}

async function validatePassword(
  providedPassword: string,
  userPassword: string,
): Promise<void> {
  const isPasswordValid = await password.compare(
    providedPassword,
    userPassword,
  );

  if (!isPasswordValid) {
    throw new UnathorizedError({
      message: "Senha inválida.",
      action: "Verifique se a senha está digitada corretamente.",
    });
  }
}

async function findUserByEmail(providedEmail: string): Promise<User> {
  let storedUser: User;

  try {
    storedUser = await user.findOneByEmail(providedEmail);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnathorizedError({
        message: "Email inválido.",
        action: "Verifique se o email está digitado corretamente.",
      });
    }

    throw error;
  }
  return storedUser;
}

const authentication: AuthenticationModel = {
  getAuthentication,
};

export default authentication;
