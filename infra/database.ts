// Destructured from the default export rather than named-imported — `pg`
// ships as CJS, and a named import can't be statically resolved under
// native Node ESM (as opposed to webpack/ts-jest, which both paper over
// this with their own CJS interop), which is what Playwright's test
// runner uses to load tests/orchestrator.ts's dependency chain.
import pg from "pg";
import type { Client as PgClient, QueryResultRow } from "pg";
import { ServiceError } from "./errors";
import type {
  DatabaseQuery,
  DatabaseResult,
  DatabaseModel,
} from "../types/index";

const { Client, Pool } = pg;

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
      message: "Erro ao conectar ao banco de dados.",
    });
  }
}

// Returns a dedicated Client for callers that manage their own connection
// lifecycle (e.g. the migrator with advisory locks). Pool is not used here
// because those callers call client.end() to release the connection.
async function getNewClient(): Promise<PgClient> {
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
