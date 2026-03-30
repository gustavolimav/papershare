import { Client, Pool } from "pg";
import type { QueryResultRow } from "pg";
import { ServiceError } from "./errors";
import type {
  DatabaseQuery,
  DatabaseResult,
  DatabaseModel,
} from "../types/index";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: getSSLValues(),
});

async function query<T extends QueryResultRow = any>(
  queryObject: string | DatabaseQuery,
): Promise<DatabaseResult<T>> {
  try {
    const result = await pool.query(queryObject);

    return result;
  } catch (error) {
    throw new ServiceError({
      cause: error as Error,
      message: "Error connecting to the database",
    });
  }
}

// Returns a dedicated Client for callers that manage their own connection
// lifecycle (e.g. the migrator with advisory locks). Pool is not used here
// because those callers call client.end() to release the connection.
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
