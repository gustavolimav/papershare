import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import controller from '../../../../infra/controller.ts';
import migrator from '../../../../models/migrator.ts';
import type { RunMigration } from '../../../../types/index.ts';

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request: NextApiRequest, response: NextApiResponse<RunMigration[]>) {
  const pendingMigrations = await migrator.listPendingMigrations();
  return response.status(200).json(pendingMigrations);
}

async function postHandler(request: NextApiRequest, response: NextApiResponse<RunMigration[]>) {
  const migratedMigrations = await migrator.runPendingMigrations();

  if (migratedMigrations.length > 0) {
    return response.status(201).json(migratedMigrations);
  }

  return response.status(200).json(migratedMigrations);
}
