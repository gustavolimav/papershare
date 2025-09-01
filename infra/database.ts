import { Client } from "pg";
import type { QueryResultRow } from "pg";
import { ServiceError } from "./errors";
import type {
  DatabaseQuery,
  DatabaseResult,
  DatabaseModel,
} from "../types/index";

async function query<T extends QueryResultRow = any>(
  queryObject: string | DatabaseQuery,
): Promise<DatabaseResult<T>> {
  let client: Client | undefined;

  try {
    client = await getNewClient();

    const result = await client.query(queryObject);

    return result;
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      cause: error as Error,
      message: "Error connecting to the database",
    });

    throw serviceErrorObject;
  } finally {
    await client?.end();
  }
}

async function getNewClient(): Promise<Client> {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSSLValues(),
  });

  await client.connect();

  return client;
}

function getSSLValues(): boolean {
  return process.env.NODE_ENV === "production";
}

const database: DatabaseModel = {
  query,
  getNewClient,
};

export default database;
