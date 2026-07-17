import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import type {
  Workspace,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceModel,
} from "../types/index";

const WORKSPACE_COLUMNS = `
  id, name, created_by, is_personal, created_at, updated_at, deleted_at
`;

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

// Creates the workspace + its creator's owner membership atomically — a
// workspace with no members would be an orphaned, unreachable resource.
async function create(userId: string, name: string): Promise<Workspace> {
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    const workspaceResult = await client.query({
      text: `
        INSERT INTO
          workspaces (name, created_by, is_personal)
        VALUES
          ($1, $2, false)
        RETURNING
          ${WORKSPACE_COLUMNS}
        ;`,
      values: [name, userId],
    });

    const workspace = workspaceResult.rows[0] as Workspace;

    await client.query({
      text: `
        INSERT INTO
          workspace_members (workspace_id, user_id, role)
        VALUES
          ($1, $2, 'owner')
        ;`,
      values: [workspace.id, userId],
    });

    await client.query("COMMIT");

    return workspace;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function findAllByUserId(userId: string): Promise<WorkspaceWithRole[]> {
  const results = await database.query<WorkspaceWithRole>({
    text: `
        SELECT
          workspaces.id,
          workspaces.name,
          workspaces.created_by,
          workspaces.is_personal,
          workspaces.created_at,
          workspaces.updated_at,
          workspaces.deleted_at,
          workspace_members.role
        FROM
          workspaces
        JOIN
          workspace_members ON workspace_members.workspace_id = workspaces.id
        WHERE
          workspace_members.user_id = $1
          AND workspaces.deleted_at IS NULL
        ORDER BY
          workspaces.is_personal DESC,
          workspaces.created_at ASC
        ;`,
    values: [userId],
  });

  return results.rows;
}

// Central authorization check, reused by every workspace-scoped model
// function (documents/share-links in a later story, membership management
// below). Deliberately returns the same 404 whether the workspace doesn't
// exist, is deleted, or the user simply isn't a member — a 403 would leak
// that a workspace the requester can't see actually exists.
async function requireRole(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole,
): Promise<void> {
  const results = await database.query<{
    deleted_at: Date | null;
    role: WorkspaceRole | null;
  }>({
    text: `
        SELECT
          workspaces.deleted_at,
          workspace_members.role
        FROM
          workspaces
        LEFT JOIN
          workspace_members ON workspace_members.workspace_id = workspaces.id
          AND workspace_members.user_id = $2
        WHERE
          workspaces.id = $1
        ;`,
    values: [workspaceId, userId],
  });

  const row = results.rows[0];

  if (!row || row.deleted_at || !row.role) {
    throw new NotFoundError({
      message: "O workspace informado não foi encontrado.",
      action: "Verifique se o identificador está correto.",
    });
  }

  if (ROLE_RANK[row.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para realizar esta operação neste workspace.",
      action: "Peça para um owner do workspace realizar esta ação.",
    });
  }
}

async function updateById(
  workspaceId: string,
  userId: string,
  name: string,
): Promise<Workspace> {
  await requireRole(workspaceId, userId, "owner");
  await assertNotPersonal(
    workspaceId,
    "O workspace pessoal não pode ser renomeado.",
  );

  const results = await database.query<Workspace>({
    text: `
        UPDATE
          workspaces
        SET
          name = $1,
          updated_at = NOW()
        WHERE
          id = $2
        RETURNING
          ${WORKSPACE_COLUMNS}
        ;`,
    values: [name, workspaceId],
  });

  return results.rows[0]!;
}

async function deleteById(workspaceId: string, userId: string): Promise<void> {
  await requireRole(workspaceId, userId, "owner");
  await assertNotPersonal(
    workspaceId,
    "O workspace pessoal não pode ser excluído.",
  );

  await database.query({
    text: `
        UPDATE
          workspaces
        SET
          deleted_at = NOW()
        WHERE
          id = $1
        ;`,
    values: [workspaceId],
  });
}

async function activate(
  workspaceId: string,
  userId: string,
): Promise<Workspace> {
  await requireRole(workspaceId, userId, "viewer");

  await database.query({
    text: `
        UPDATE
          users
        SET
          active_workspace_id = $1
        WHERE
          id = $2
        ;`,
    values: [workspaceId, userId],
  });

  const workspaceResult = await database.query<Workspace>({
    text: `
        SELECT
          ${WORKSPACE_COLUMNS}
        FROM
          workspaces
        WHERE
          id = $1
        ;`,
    values: [workspaceId],
  });

  return workspaceResult.rows[0]!;
}

async function assertNotPersonal(
  workspaceId: string,
  message: string,
): Promise<void> {
  const results = await database.query<{ is_personal: boolean }>({
    text: `
        SELECT
          is_personal
        FROM
          workspaces
        WHERE
          id = $1
        ;`,
    values: [workspaceId],
  });

  if (results.rows[0]?.is_personal) {
    throw new ForbiddenError({
      message,
      action:
        "Crie um novo workspace de equipe para colaborar com outras pessoas.",
    });
  }
}

const workspace: WorkspaceModel = {
  create,
  findAllByUserId,
  requireRole,
  updateById,
  deleteById,
  activate,
};

export default workspace;
