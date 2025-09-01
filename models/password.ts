import bcrypt from "bcryptjs";
import type { PasswordModel } from "../types/index";

async function hash(password: string): Promise<string> {
  const rounds = getNumberOfRounds();

  return await bcrypt.hash(pepperPassword(password), rounds);
}

async function compare(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pepperPassword(password), hash);
}

function pepperPassword(password: string): string {
  const pepper = process.env.PEPPER;

  if (!pepper) {
    throw new Error("PEPPER environment variable is not set");
  }

  return password + pepper;
}

function getNumberOfRounds(): number {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

const password: PasswordModel = {
  hash,
  compare,
};

export default password;
