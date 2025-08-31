import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import database from "../../../../infra/database.ts";
import controller from "../../../../infra/controller.ts";
import type { StatusResponse } from "../../../../types/index.ts";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(
  request: NextApiRequest,
  response: NextApiResponse<StatusResponse>,
) {
  const updatedAt = new Date().toISOString();
  const databaseOpenedConnections = await getDatabaseOpenedConnections();
  const databaseMaxConnections = await getDatabaseMaxConnections();
  const databaseVersion = await getDatabaseVersion();

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersion,
        max_connections: databaseMaxConnections,
        opened_connections: databaseOpenedConnections,
      },
    },
  });
}

async function getDatabaseMaxConnections(): Promise<number> {
  const result = await database.query<{ max_connections: string }>(
    "SHOW max_connections;",
  );

  return parseInt(result.rows[0]!.max_connections);
}

async function getDatabaseOpenedConnections(): Promise<number> {
  const databaseOpenedConnectionsResult = await database.query<{
    count: number;
  }>({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [process.env.POSTGRES_DB],
  });

  return databaseOpenedConnectionsResult.rows[0]!.count;
}

async function getDatabaseVersion(): Promise<string> {
  const databaseVersionResult = await database.query<{
    server_version: string;
  }>("SHOW server_version;");

  return databaseVersionResult.rows[0]!.server_version;
}
