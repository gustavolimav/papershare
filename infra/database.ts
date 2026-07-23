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

// On Vercel, every serverless function invocation gets its own process
// with its own module scope — so this Pool (created once at import time)
// is really "one small pool per concurrent invocation," not one pool
// shared across the whole app the way it is for a long-running Docker/
// local Node process. `pg`'s own default (max: 10) sized for the latter
// would let enough concurrent invocations collectively exhaust a small
// Postgres instance's total connection limit. `VERCEL` is a platform
// env var Vercel sets automatically in every deployment (build and
// runtime) — used here only to size the pool, not to change query
// behavior. A short idleTimeoutMillis matters for the same reason: an
// idle connection should release quickly rather than linger for as long
// as a frozen/paused function container survives.
//
// This does not by itself make the *connection itself* pooled at the
// database side — if the Postgres provider offers a PgBouncer-fronted
// endpoint (e.g. Neon's `-pooler` hostname, Supabase's "Transaction"
// pooling mode), point POSTGRES_HOST at that endpoint in production;
// no code change needed, since the connection is already built from
// plain host/port/user/db/password env vars.
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  ssl: getSSLValues(),
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 10000 : 30000,
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
