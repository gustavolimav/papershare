import { migrate, loadMigrationFiles } from "postgres-migrations";
import { resolve } from "node:path";
import database from "../infra/database";
import type { MigratorModel } from "../types/index";

// Define the return type compatible with original interface
interface RunMigration {
  path: string;
  name: string;
  timestamp: string;
}

const migrationsDirectory = resolve("infra", "migrations");

async function listPendingMigrations(): Promise<RunMigration[]> {
  let dbClient;

  try {
    dbClient = await database.getNewClient();

    // Load all migration files from directory
    const allMigrations = await loadMigrationFiles(migrationsDirectory);

    // Get already run migrations from the database
    const result = await dbClient.query(
      "SELECT name FROM migrations ORDER BY id",
    );
    const runMigrations = new Set(result.rows.map((row: any) => row.name));

    // Filter to get only pending migrations
    const pendingMigrations = allMigrations
      .filter((migration) => !runMigrations.has(migration.name))
      .map((migration) => ({
        path: migration.fileName,
        name: migration.name,
        timestamp: new Date().toISOString(),
      }));

    return pendingMigrations;
  } catch (error) {
    // If migrations table doesn't exist, all migrations are pending
    if (
      error instanceof Error &&
      error.message.includes('relation "migrations" does not exist')
    ) {
      const allMigrations = await loadMigrationFiles(migrationsDirectory);
      return allMigrations.map((migration) => ({
        path: migration.fileName,
        name: migration.name,
        timestamp: new Date().toISOString(),
      }));
    }
    throw error;
  } finally {
    await dbClient?.end();
  }
}

async function runPendingMigrations(): Promise<RunMigration[]> {
  let dbClient;

  console.log("Running pending migrations...");

  try {
    dbClient = await database.getNewClient();

    const migratedMigrations = await migrate(
      { client: dbClient },
      migrationsDirectory,
      {
        logger: (msg: string) => console.log(msg),
      },
    );

    return migratedMigrations.map((migration) => ({
      path: migration.fileName,
      name: migration.name,
      timestamp: new Date().toISOString(),
    }));
  } finally {
    await dbClient?.end();
  }
}

const migrator: MigratorModel = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
