import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import password from "./password";
import workspace from "./workspace";
import type {
  DataRoomLink,
  DataRoomLinkResponse,
  DataRoomLinkCreateInput,
  DataRoomLinkUpdateInput,
  DataRoomLinkWithDocuments,
  DataRoomDocumentSummary,
  DataRoomLinkModel,
  QueryParam,
} from "../types/index";

const DATA_ROOM_LINK_COLUMNS = `
  id, token, data_room_id, user_id, label, password_hash,
  expires_at, is_active, created_at, updated_at
`;

function toResponse(link: DataRoomLink): DataRoomLinkResponse {
  const { password_hash, ...rest } = link;
  return { ...rest, has_password: password_hash !== null };
}

function assertLinkIsActiveAndNotExpired(row: {
  is_active: boolean;
  expires_at: Date | null;
}): void {
  if (!row.is_active) {
    throw new ForbiddenError({
      message: "Este link foi revogado.",
      action: "Solicite um novo link ao proprietário da data room.",
    });
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new ForbiddenError({
      message: "Este link expirou.",
      action: "Solicite um novo link ao proprietário da data room.",
    });
  }
}

// Existence + soft-delete check only — mirrors shareLink.ts's
// getDocumentWorkspaceId, every caller does its own requireRole() first.
async function getRoomWorkspaceId(dataRoomId: string): Promise<string> {
  const results = await database.query<{ workspace_id: string }>({
    text: `
        SELECT
          workspace_id
        FROM
          data_rooms
        WHERE
          id = $1
          AND deleted_at IS NULL
        ;`,
    values: [dataRoomId],
  });

  const workspaceId = results.rows[0]?.workspace_id;

  if (!workspaceId) {
    throw new NotFoundError({
      message: "A data room informada não foi encontrada.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return workspaceId;
}

async function findLinkRow(
  id: string,
  dataRoomId: string,
): Promise<DataRoomLinkResponse> {
  const results = await database.query<DataRoomLink>({
    text: `
        SELECT
          ${DATA_ROOM_LINK_COLUMNS}
        FROM
          data_room_links
        WHERE
          id = $1
          AND data_room_id = $2
        LIMIT
          1
        ;`,
    values: [id, dataRoomId],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O link informado não foi encontrado.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return toResponse(results.rows[0]!);
}

async function create(
  dataRoomId: string,
  userId: string,
  input: DataRoomLinkCreateInput,
): Promise<DataRoomLinkResponse> {
  const workspaceId = await getRoomWorkspaceId(dataRoomId);
  await workspace.requireRole(workspaceId, userId, "editor");

  const passwordHash = input.password
    ? await password.hash(input.password)
    : null;

  const results = await database.query<DataRoomLink>({
    text: `
        INSERT INTO
          data_room_links (data_room_id, user_id, label, password_hash, expires_at)
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING
          ${DATA_ROOM_LINK_COLUMNS}
        ;`,
    values: [
      dataRoomId,
      userId,
      input.label ?? null,
      passwordHash,
      input.expires_at ?? null,
    ],
  });

  return toResponse(results.rows[0]!);
}

async function findAllByDataRoomId(
  dataRoomId: string,
  userId: string,
): Promise<DataRoomLinkResponse[]> {
  const workspaceId = await getRoomWorkspaceId(dataRoomId);
  await workspace.requireRole(workspaceId, userId, "viewer");

  const results = await database.query<DataRoomLink>({
    text: `
        SELECT
          ${DATA_ROOM_LINK_COLUMNS}
        FROM
          data_room_links
        WHERE
          data_room_id = $1
        ORDER BY
          created_at DESC
        ;`,
    values: [dataRoomId],
  });

  return results.rows.map(toResponse);
}

async function updateById(
  id: string,
  dataRoomId: string,
  userId: string,
  input: DataRoomLinkUpdateInput,
): Promise<DataRoomLinkResponse> {
  const workspaceId = await getRoomWorkspaceId(dataRoomId);
  await workspace.requireRole(workspaceId, userId, "editor");
  await findLinkRow(id, dataRoomId);

  const setClauses: string[] = [];
  const values: QueryParam[] = [];

  if (input.label !== undefined) {
    values.push(input.label);
    setClauses.push(`label = $${values.length}`);
  }

  if (input.password !== undefined) {
    values.push(
      input.password === null ? null : await password.hash(input.password),
    );
    setClauses.push(`password_hash = $${values.length}`);
  }

  if (input.expires_at !== undefined) {
    values.push(input.expires_at);
    setClauses.push(`expires_at = $${values.length}`);
  }

  if (input.is_active !== undefined) {
    values.push(input.is_active);
    setClauses.push(`is_active = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findLinkRow(id, dataRoomId);
  }

  values.push(id);

  const results = await database.query<DataRoomLink>({
    text: `
        UPDATE
          data_room_links
        SET
          ${setClauses.join(",\n          ")}
        WHERE
          id = $${values.length}
        RETURNING
          ${DATA_ROOM_LINK_COLUMNS}
        ;`,
    values,
  });

  return toResponse(results.rows[0]!);
}

interface DataRoomLinkTokenRow {
  link_id: string;
  token: string;
  label: string | null;
  password_hash: string | null;
  expires_at: Date | null;
  is_active: boolean;
  data_room_id: string;
  data_room_name: string;
}

async function fetchAndValidateTokenRow(
  token: string,
  providedPassword?: string,
): Promise<DataRoomLinkTokenRow> {
  const results = await database.query<DataRoomLinkTokenRow>({
    text: `
        SELECT
          drl.id AS link_id,
          drl.token,
          drl.label,
          drl.password_hash,
          drl.expires_at,
          drl.is_active,
          dr.id AS data_room_id,
          dr.name AS data_room_name
        FROM
          data_room_links drl
        JOIN
          data_rooms dr ON dr.id = drl.data_room_id
        WHERE
          drl.token = $1
          AND dr.deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [token],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O link informado não foi encontrado.",
      action: "Verifique se o link está correto.",
    });
  }

  const row = results.rows[0]!;

  assertLinkIsActiveAndNotExpired(row);

  if (row.password_hash) {
    const isPasswordValid =
      !!providedPassword &&
      (await password.compare(providedPassword, row.password_hash));

    if (!isPasswordValid) {
      throw new ForbiddenError({
        message: "Senha incorreta.",
        action: "Verifique a senha e tente novamente.",
      });
    }
  }

  return row;
}

async function getRoomDocuments(
  dataRoomId: string,
): Promise<DataRoomDocumentSummary[]> {
  const results = await database.query<DataRoomDocumentSummary>({
    text: `
        SELECT
          documents.id AS document_id,
          documents.title,
          documents.mime_type,
          documents.page_count,
          data_room_documents.allow_download
        FROM
          data_room_documents
        JOIN
          documents ON documents.id = data_room_documents.document_id
        WHERE
          data_room_documents.data_room_id = $1
          AND documents.deleted_at IS NULL
        ORDER BY
          data_room_documents.added_at ASC
        ;`,
    values: [dataRoomId],
  });

  return results.rows;
}

async function getByToken(
  token: string,
  providedPassword?: string,
): Promise<DataRoomLinkWithDocuments> {
  const row = await fetchAndValidateTokenRow(token, providedPassword);

  return {
    id: row.link_id,
    token: row.token,
    label: row.label,
    expires_at: row.expires_at,
    is_active: row.is_active,
    has_password: row.password_hash !== null,
    data_room: { id: row.data_room_id, name: row.data_room_name },
    documents: await getRoomDocuments(row.data_room_id),
  };
}

// Used only by the internal file-proxy route — storage_key is
// deliberately excluded from DataRoomLinkWithDocuments (the public
// response shape above). Validates document_id actually belongs to this
// room, so a guessed/unrelated document id can't be pulled through a
// valid room token.
async function getFileByToken(
  token: string,
  documentId: string,
  providedPassword?: string,
): Promise<{ storage_key: string; mime_type: string }> {
  const row = await fetchAndValidateTokenRow(token, providedPassword);

  const results = await database.query<{
    storage_key: string;
    mime_type: string;
  }>({
    text: `
        SELECT
          documents.storage_key,
          documents.mime_type
        FROM
          data_room_documents
        JOIN
          documents ON documents.id = data_room_documents.document_id
        WHERE
          data_room_documents.data_room_id = $1
          AND data_room_documents.document_id = $2
          AND documents.deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [row.data_room_id, documentId],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O documento informado não pertence a esta data room.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return results.rows[0]!;
}

const dataRoomLink: DataRoomLinkModel = {
  create,
  findAllByDataRoomId,
  updateById,
  getByToken,
  getFileByToken,
};

export default dataRoomLink;
