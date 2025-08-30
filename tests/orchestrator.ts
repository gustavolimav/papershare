import retry from 'async-retry';
import { faker } from '@faker-js/faker';

import database from '../infra/database.ts';
import migrator from '../models/migrator.ts';
import user from '../models/user.ts';
import type { UserCreateInput, UserPublic } from '../types/index.ts';

async function waitForAllServices(): Promise<void> {
  await waitForWebServer();

  async function waitForWebServer(): Promise<void> {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage(): Promise<void> {
      const response = await fetch('http://localhost:3000/api/v1/status');

      if (response.status !== 200) {
        throw new Error('Status page not ready');
      }
    }
  }
}

async function cleanDatabase(): Promise<void> {
  await database.query('drop schema public cascade; create schema public;');
}

async function runPendingMigrations(): Promise<void> {
  await migrator.runPendingMigrations();
}

async function createUser(userObject?: Partial<UserCreateInput>): Promise<UserPublic> {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ''),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || 'validpassword',
  });
}

interface Orchestrator {
  waitForAllServices(): Promise<void>;
  cleanDatabase(): Promise<void>;
  runPendingMigrations(): Promise<void>;
  createUser(userObject?: Partial<UserCreateInput>): Promise<UserPublic>;
}

const orchestrator: Orchestrator = {
  waitForAllServices,
  cleanDatabase,
  runPendingMigrations,
  createUser,
};

export default orchestrator;
