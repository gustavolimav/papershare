import crypto from "crypto";
import database from "../infra/database";
import { NotFoundError } from "../infra/errors";
import workspace from "./workspace";
import type {
  Document,
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentResponse,
  DocumentListResponse,
  DocumentSummaryResponse,
  DocumentModel,
} from "../types/index";

const DOCUMENT_COLUMNS = `
  id, title, description, original_filename, storage_key, mime_type,
  size_bytes, page_count, user_id, workspace_id, ai_summary,
  ai_summary_generated_at, created_at, updated_at, deleted_at
`;

async function create(input: DocumentCreateInput): Promise<DocumentResponse> {
  // input.user_id is always the acting/authenticated user (the uploader),
  // never someone else's id on their behalf — same value doubles as the
  // audit field on the inserted row and the identity checked here.
  await workspace.requireRole(input.workspace_id, input.user_id, "editor");

  const id = crypto.randomUUID();

  const results = await database.query<Document>({
    text: `
        INSERT INTO
          documents (
            id, title, description, original_filename, storage_key,
            mime_type, size_bytes, page_count, user_id, workspace_id
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          ${DOCUMENT_COLUMNS}
        ;`,
    values: [
      id,
      input.title,
      input.description ?? null,
      input.original_filename,
      input.storage_key,
      input.mime_type,
      input.size_bytes,
      input.page_count,
      input.user_id,
      input.workspace_id,
    ],
  });

  return results.rows[0]!;
}

async function findAllByWorkspaceId(
  workspaceId: string,
  pagination: { page: number; perPage: number },
): Promise<DocumentListResponse> {
  const offset = (pagination.page - 1) * pagination.perPage;

  const [documentsResult, countResult] = await Promise.all([
    database.query<Document & { uploaded_by_username: string }>({
      text: `
          SELECT
            documents.id, documents.title, documents.description,
            documents.original_filename, documents.storage_key,
            documents.mime_type, documents.size_bytes, documents.page_count,
            documents.user_id, documents.workspace_id, documents.ai_summary,
            documents.ai_summary_generated_at, documents.created_at,
            documents.updated_at, documents.deleted_at,
            users.username AS uploaded_by_username
          FROM
            documents
          JOIN
            users ON users.id = documents.user_id
          WHERE
            documents.workspace_id = $1
            AND documents.deleted_at IS NULL
          ORDER BY
            documents.created_at DESC
          LIMIT
            $2
          OFFSET
            $3
          ;`,
      values: [workspaceId, pagination.perPage, offset],
    }),
    database.query<{ count: string }>({
      text: `
          SELECT
            COUNT(*)::text AS count
          FROM
            documents
          WHERE
            workspace_id = $1
            AND deleted_at IS NULL
          ;`,
      values: [workspaceId],
    }),
  ]);

  return {
    documents: documentsResult.rows,
    total: Number(countResult.rows[0]!.count),
  };
}

// No role check — an existence/deleted_at check only. Every public function
// below layers its own requireRole() on top, at whatever level (viewer for
// reads, editor for writes) is appropriate for that operation.
async function findOneByIdRaw(id: string): Promise<Document> {
  const results = await database.query<Document>({
    text: `
        SELECT
          ${DOCUMENT_COLUMNS}
        FROM
          documents
        WHERE
          id = $1
          AND deleted_at IS NULL
        LIMIT
          1
        ;`,
    values: [id],
  });

  if (!results.rowCount || results.rowCount === 0) {
    throw new NotFoundError({
      message: "O documento informado não foi encontrado.",
      action: "Verifique se o identificador está correto.",
    });
  }

  return results.rows[0]!;
}

async function findOneById(
  id: string,
  userId: string,
): Promise<DocumentResponse> {
  const document = await findOneByIdRaw(id);

  await workspace.requireRole(document.workspace_id, userId, "viewer");

  return document;
}

async function updateById(
  id: string,
  userId: string,
  input: DocumentUpdateInput,
): Promise<DocumentResponse> {
  const document = await findOneByIdRaw(id);

  await workspace.requireRole(document.workspace_id, userId, "editor");

  const results = await database.query<Document>({
    text: `
        UPDATE
          documents
        SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          updated_at = NOW()
        WHERE
          id = $3
        RETURNING
          ${DOCUMENT_COLUMNS}
        ;`,
    values: [input.title ?? null, input.description ?? null, id],
  });

  return results.rows[0]!;
}

async function deleteById(
  id: string,
  userId: string,
): Promise<{ storage_key: string }> {
  const document = await findOneByIdRaw(id);

  await workspace.requireRole(document.workspace_id, userId, "editor");

  const results = await database.query<{ storage_key: string }>({
    text: `
        UPDATE
          documents
        SET
          deleted_at = NOW()
        WHERE
          id = $1
        RETURNING
          storage_key
        ;`,
    values: [id],
  });

  return { storage_key: results.rows[0]!.storage_key };
}

async function updateSummary(
  id: string,
  summary: string,
): Promise<DocumentSummaryResponse> {
  const results = await database.query<{
    ai_summary: string | null;
    ai_summary_generated_at: Date | null;
  }>({
    text: `
        UPDATE
          documents
        SET
          ai_summary = $1,
          ai_summary_generated_at = NOW()
        WHERE
          id = $2
        RETURNING
          ai_summary, ai_summary_generated_at
        ;`,
    values: [summary, id],
  });

  const row = results.rows[0]!;

  return { summary: row.ai_summary, generated_at: row.ai_summary_generated_at };
}

const document: DocumentModel = {
  create,
  findAllByWorkspaceId,
  findOneById,
  updateById,
  deleteById,
  updateSummary,
};

export default document;
