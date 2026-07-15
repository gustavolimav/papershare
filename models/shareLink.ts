import crypto from "crypto";
import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import password from "./password";
import type {
  ShareLink,
  ShareLinkResponse,
  ShareLinkCreateInput,
  ShareLinkUpdateInput,
  ShareLinkWithDocument,
  ShareLinkNotificationInfo,
  ShareLinkModel,
} from "../types/index";

const SHARE_LINK_COLUMNS = `
  id, token, document_id, user_id, label, password_hash,
  expires_at, allow_download, is_active, created_at, updated_at,
  notify_on_view
`;

interface ShareLinkTokenRow {
  link_id: string;
  token: string;
  label: string | null;
  password_hash: string | null;
  expires_at: Date | null;
  allow_download: boolean;
  is_active: boolean;
  link_created_at: Date;
  document_id: string;
  title: string;
  description: string | null;
  mime_type: string;
  size_bytes: number;
  page_count: number | null;
  storage_key: string;
  document_deleted_at: Date | null;
}

function toResponse(link: ShareLink): ShareLinkResponse {
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
      action: "Solicite um novo link ao proprietário do documento.",
    });
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new ForbiddenError({
      message: "Este link expirou.",
      action: "Solicite um novo link ao proprietário do documento.",
    });
  }
}

async function create(
  documentId: string,
  userId: string,
  input: ShareLinkCreateInput,
): Promise<ShareLinkResponse> {
  const id = crypto.randomUUID();
  const passwordHash = input.password
    ? await password.hash(input.password)
    : null;

  const results = await database.query<ShareLink>({
    text: `
        INSERT INTO
          share_links (
            id, document_id, user_id, label, password_hash,
            expires_at, allow_download, notify_on_view
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          ${SHARE_LINK_COLUMNS}
        ;`,
    values: [
      id,
      documentId,
      userId,
      input.label ?? null,
      passwordHash,
      input.expires_at ?? null,
      input.allow_download ?? true,
      input.notify_on_view ?? true,
    ],
  });

  return toResponse(results.rows[0]!);
}

async function findAllByDocumentId(
  documentId: string,
): Promise<ShareLinkResponse[]> {
  const results = await database.query<ShareLink>({
    text: `
        SELECT
          ${SHARE_LINK_COLUMNS}
        FROM
          share_links
        WHERE
          document_id = $1
        ORDER BY
          created_at DESC
        ;`,
    values: [documentId],
  });

  return results.rows.map(toResponse);
}

async function findOneById(
  id: string,
  documentId: string,
): Promise<ShareLinkResponse> {
  const results = await database.query<ShareLink>({
    text: `
        SELECT
          ${SHARE_LINK_COLUMNS}
        FROM
          share_links
        WHERE
          id = $1
          AND document_id = $2
        LIMIT
          1
        ;`,
    values: [id, documentId],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O link de compartilhamento informado não foi encontrado.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return toResponse(results.rows[0]!);
}

async function updateById(
  id: string,
  documentId: string,
  input: ShareLinkUpdateInput,
): Promise<ShareLinkResponse> {
  await findOneById(id, documentId);

  const setClauses: string[] = [];
  const values: unknown[] = [];

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

  if (input.allow_download !== undefined) {
    values.push(input.allow_download);
    setClauses.push(`allow_download = $${values.length}`);
  }

  if (input.is_active !== undefined) {
    values.push(input.is_active);
    setClauses.push(`is_active = $${values.length}`);
  }

  if (input.notify_on_view !== undefined) {
    values.push(input.notify_on_view);
    setClauses.push(`notify_on_view = $${values.length}`);
  }

  setClauses.push("updated_at = NOW()");
  values.push(id);

  const results = await database.query<ShareLink>({
    text: `
        UPDATE
          share_links
        SET
          ${setClauses.join(",\n          ")}
        WHERE
          id = $${values.length}
        RETURNING
          ${SHARE_LINK_COLUMNS}
        ;`,
    values,
  });

  return toResponse(results.rows[0]!);
}

async function revokeById(
  id: string,
  documentId: string,
): Promise<ShareLinkResponse> {
  await findOneById(id, documentId);

  const results = await database.query<ShareLink>({
    text: `
        UPDATE
          share_links
        SET
          is_active = FALSE,
          updated_at = NOW()
        WHERE
          id = $1
        RETURNING
          ${SHARE_LINK_COLUMNS}
        ;`,
    values: [id],
  });

  return toResponse(results.rows[0]!);
}

async function fetchAndValidateTokenRow(
  token: string,
  providedPassword?: string,
): Promise<ShareLinkTokenRow> {
  const results = await database.query<ShareLinkTokenRow>({
    text: `
        SELECT
          sl.id AS link_id,
          sl.token,
          sl.label,
          sl.password_hash,
          sl.expires_at,
          sl.allow_download,
          sl.is_active,
          sl.created_at AS link_created_at,
          d.id AS document_id,
          d.title,
          d.description,
          d.mime_type,
          d.size_bytes,
          d.page_count,
          d.storage_key,
          d.deleted_at AS document_deleted_at
        FROM
          share_links sl
        JOIN
          documents d ON d.id = sl.document_id
        WHERE
          sl.token = $1
        LIMIT
          1
        ;`,
    values: [token],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O link de compartilhamento informado não foi encontrado.",
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

  if (row.document_deleted_at) {
    throw new NotFoundError({
      message: "O documento deste link não está mais disponível.",
      action: "Solicite um novo link ao proprietário do documento.",
    });
  }

  return row;
}

async function getByToken(
  token: string,
  providedPassword?: string,
): Promise<ShareLinkWithDocument> {
  const row = await fetchAndValidateTokenRow(token, providedPassword);

  return {
    id: row.link_id,
    token: row.token,
    label: row.label,
    expires_at: row.expires_at,
    allow_download: row.allow_download,
    is_active: row.is_active,
    created_at: row.link_created_at,
    has_password: row.password_hash !== null,
    document: {
      id: row.document_id,
      title: row.title,
      description: row.description,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      page_count: row.page_count,
    },
  };
}

// Used only by the internal file-proxy route — storage_key is deliberately
// excluded from ShareLinkWithDocument (the public response shape above).
async function getFileByToken(
  token: string,
  providedPassword?: string,
): Promise<{ storage_key: string; mime_type: string }> {
  const row = await fetchAndValidateTokenRow(token, providedPassword);

  return { storage_key: row.storage_key, mime_type: row.mime_type };
}

// Skips the password check: used by view-event recording, which happens
// after the viewer has already passed the password gate on the viewer page.
async function validateToken(token: string): Promise<{ id: string }> {
  const results = await database.query<{
    id: string;
    is_active: boolean;
    expires_at: Date | null;
  }>({
    text: `
        SELECT
          id, is_active, expires_at
        FROM
          share_links
        WHERE
          token = $1
        LIMIT
          1
        ;`,
    values: [token],
  });

  if (!results.rowCount) {
    throw new NotFoundError({
      message: "O link de compartilhamento informado não foi encontrado.",
      action: "Verifique se o link está correto.",
    });
  }

  const row = results.rows[0]!;

  assertLinkIsActiveAndNotExpired(row);

  return { id: row.id };
}

// Used to notify the document owner when a share link gets a new viewer.
async function getNotificationInfo(
  shareLinkId: string,
): Promise<ShareLinkNotificationInfo | null> {
  const results = await database.query<ShareLinkNotificationInfo>({
    text: `
        SELECT
          u.email AS owner_email,
          d.id AS document_id,
          d.title AS document_title,
          sl.label AS link_label,
          sl.notify_on_view
        FROM
          share_links sl
        JOIN
          documents d ON d.id = sl.document_id
        JOIN
          users u ON u.id = d.user_id
        WHERE
          sl.id = $1
        LIMIT
          1
        ;`,
    values: [shareLinkId],
  });

  return results.rows[0] ?? null;
}

const shareLink: ShareLinkModel = {
  create,
  findAllByDocumentId,
  findOneById,
  updateById,
  revokeById,
  getByToken,
  getFileByToken,
  validateToken,
  getNotificationInfo,
};

export default shareLink;
