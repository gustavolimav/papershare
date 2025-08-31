import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "../infra/database.ts";
import type { MigratorModel } from "../types/index.ts";

// Define the actual return type from node-pg-migrate
interface RunMigration {
  name: string;
  filename: string;
}

const defaultMigrationOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up" as const,
  log: () => {},
  migrationsTable: "pgmigrations",
};

async function listPendingMigrations(): Promise<RunMigration[]> {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const pendingMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
    });
    return pendingMigrations as any as RunMigration[];
  } finally {
    await dbClient?.end();
  }
}

async function runPendingMigrations(): Promise<RunMigration[]> {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    const migratedMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
      dryRun: false,
    });

    return migratedMigrations as any as RunMigration[];
  } finally {
    await dbClient?.end();
  }
}

const migrator: MigratorModel = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
