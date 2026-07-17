import database from "../infra/database";
import { NotFoundError, ForbiddenError, ConflictError } from "../infra/errors";
import user from "./user";
import type {
  Workspace,
  WorkspaceRole,
  WorkspaceWithRole,
  WorkspaceMemberResponse,
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
          workspace_members.role,
          (
            SELECT COUNT(*)::int FROM workspace_members wm2
            WHERE wm2.workspace_id = workspaces.id
          ) AS member_count,
          (
            SELECT creator.ai_api_key_encrypted IS NOT NULL FROM users creator
            WHERE creator.id = workspaces.created_by
          ) AS ai_configured
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

// Resolves the AI "identity" for a document: its workspace's creator,
// regardless of who uploaded the document or who's currently acting.
// Returns null if the document doesn't exist (e.g. deleted).
async function getCreatorIdForDocument(
  documentId: string,
): Promise<string | null> {
  const results = await database.query<{ created_by: string }>({
    text: `
        SELECT
          workspaces.created_by
        FROM
          documents
        JOIN
          workspaces ON workspaces.id = documents.workspace_id
        WHERE
          documents.id = $1
          AND documents.deleted_at IS NULL
        ;`,
    values: [documentId],
  });

  return results.rows[0]?.created_by ?? null;
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

async function listMembers(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMemberResponse[]> {
  await requireRole(workspaceId, userId, "viewer");

  const results = await database.query<WorkspaceMemberResponse>({
    text: `
        SELECT
          workspace_members.user_id,
          users.username,
          users.email,
          workspace_members.role,
          workspace_members.created_at
        FROM
          workspace_members
        JOIN
          users ON users.id = workspace_members.user_id
        WHERE
          workspace_members.workspace_id = $1
        ORDER BY
          workspace_members.created_at ASC
        ;`,
    values: [workspaceId],
  });

  return results.rows;
}

async function inviteMember(
  workspaceId: string,
  actingUserId: string,
  email: string,
  role: "editor" | "viewer",
): Promise<WorkspaceMemberResponse> {
  await requireRole(workspaceId, actingUserId, "owner");
  await assertNotPersonal(
    workspaceId,
    "Não é possível convidar membros para o workspace pessoal.",
  );

  let invitedUser;

  try {
    invitedUser = await user.findOneByEmail(email);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError({
        message:
          "Nenhuma conta encontrada com esse email. A pessoa precisa se cadastrar no Papershare antes de ser convidada.",
        action:
          "Peça para a pessoa criar uma conta no Papershare e tente novamente.",
      });
    }

    throw error;
  }

  const existingMembership = await database.query({
    text: `
        SELECT
          1
        FROM
          workspace_members
        WHERE
          workspace_id = $1
          AND user_id = $2
        ;`,
    values: [workspaceId, invitedUser.id],
  });

  if (existingMembership.rowCount) {
    throw new ConflictError({
      message: "Este usuário já é membro deste workspace.",
      action: "Verifique a lista de membros atual.",
    });
  }

  const results = await database.query<{
    user_id: string;
    role: WorkspaceRole;
    created_at: Date;
  }>({
    text: `
        INSERT INTO
          workspace_members (workspace_id, user_id, role)
        VALUES
          ($1, $2, $3)
        RETURNING
          user_id, role, created_at
        ;`,
    values: [workspaceId, invitedUser.id, role],
  });

  const member = results.rows[0]!;

  return {
    user_id: member.user_id,
    username: invitedUser.username,
    email: invitedUser.email,
    role: member.role,
    created_at: member.created_at,
  };
}

async function getMemberRole(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole> {
  const results = await database.query<{ role: WorkspaceRole }>({
    text: `
        SELECT
          role
        FROM
          workspace_members
        WHERE
          workspace_id = $1
          AND user_id = $2
        ;`,
    values: [workspaceId, userId],
  });

  const role = results.rows[0]?.role;

  if (!role) {
    throw new NotFoundError({
      message: "O membro informado não faz parte deste workspace.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return role;
}

// Only relevant when the target member currently holds "owner" — checked
// against every OTHER owner in the workspace, so a no-op reassignment
// (owner staying owner) never trips this even for the sole owner.
async function assertNotLastOwner(
  workspaceId: string,
  currentRole: WorkspaceRole,
  targetUserId: string,
  message: string,
): Promise<void> {
  if (currentRole !== "owner") {
    return;
  }

  const results = await database.query<{ count: number }>({
    text: `
        SELECT
          COUNT(*)::int AS count
        FROM
          workspace_members
        WHERE
          workspace_id = $1
          AND role = 'owner'
          AND user_id != $2
        ;`,
    values: [workspaceId, targetUserId],
  });

  if (results.rows[0]?.count === 0) {
    throw new ForbiddenError({
      message,
      action: "Promova outro membro a owner antes de continuar.",
    });
  }
}

async function updateMemberRole(
  workspaceId: string,
  actingUserId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
): Promise<WorkspaceMemberResponse> {
  await requireRole(workspaceId, actingUserId, "owner");
  await assertNotPersonal(
    workspaceId,
    "Não é possível alterar papéis no workspace pessoal.",
  );

  const currentRole = await getMemberRole(workspaceId, targetUserId);

  if (newRole !== "owner") {
    await assertNotLastOwner(
      workspaceId,
      currentRole,
      targetUserId,
      "Não é possível rebaixar o único owner deste workspace.",
    );
  }

  const results = await database.query<{
    user_id: string;
    role: WorkspaceRole;
    created_at: Date;
  }>({
    text: `
        UPDATE
          workspace_members
        SET
          role = $1
        WHERE
          workspace_id = $2
          AND user_id = $3
        RETURNING
          user_id, role, created_at
        ;`,
    values: [newRole, workspaceId, targetUserId],
  });

  const member = results.rows[0]!;
  const targetUser = await user.findOneById(targetUserId);

  return {
    user_id: member.user_id,
    username: targetUser.username,
    email: targetUser.email,
    role: member.role,
    created_at: member.created_at,
  };
}

async function removeMember(
  workspaceId: string,
  actingUserId: string,
  targetUserId: string,
): Promise<void> {
  const isSelf = actingUserId === targetUserId;

  await requireRole(workspaceId, actingUserId, isSelf ? "viewer" : "owner");
  await assertNotPersonal(
    workspaceId,
    isSelf
      ? "Não é possível sair do workspace pessoal."
      : "Não é possível remover membros do workspace pessoal.",
  );

  const currentRole = await getMemberRole(workspaceId, targetUserId);

  await assertNotLastOwner(
    workspaceId,
    currentRole,
    targetUserId,
    isSelf
      ? "Você é o único owner deste workspace — promova outro membro a owner ou exclua o workspace antes de sair."
      : "Não é possível remover o único owner deste workspace.",
  );

  await database.query({
    text: `
        DELETE FROM
          workspace_members
        WHERE
          workspace_id = $1
          AND user_id = $2
        ;`,
    values: [workspaceId, targetUserId],
  });
}

const workspace: WorkspaceModel = {
  create,
  findAllByUserId,
  requireRole,
  updateById,
  deleteById,
  activate,
  getCreatorIdForDocument,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
};

export default workspace;
