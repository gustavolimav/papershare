import crypto from "crypto";
import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
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
  size_bytes, page_count, user_id, ai_summary, ai_summary_generated_at,
  created_at, updated_at, deleted_at
`;

async function create(input: DocumentCreateInput): Promise<DocumentResponse> {
  const id = crypto.randomUUID();

  const results = await database.query<Document>({
    text: `
        INSERT INTO
          documents (
            id, title, description, original_filename, storage_key,
            mime_type, size_bytes, page_count, user_id
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    ],
  });

  return results.rows[0]!;
}

async function findAllByUserId(
  userId: string,
  pagination: { page: number; perPage: number },
): Promise<DocumentListResponse> {
  const offset = (pagination.page - 1) * pagination.perPage;

  const [documentsResult, countResult] = await Promise.all([
    database.query<Document>({
      text: `
          SELECT
            ${DOCUMENT_COLUMNS}
          FROM
            documents
          WHERE
            user_id = $1
            AND deleted_at IS NULL
          ORDER BY
            created_at DESC
          LIMIT
            $2
          OFFSET
            $3
          ;`,
      values: [userId, pagination.perPage, offset],
    }),
    database.query<{ count: string }>({
      text: `
          SELECT
            COUNT(*)::text AS count
          FROM
            documents
          WHERE
            user_id = $1
            AND deleted_at IS NULL
          ;`,
      values: [userId],
    }),
  ]);

  return {
    documents: documentsResult.rows,
    total: Number(countResult.rows[0]!.count),
  };
}

async function findOneById(
  id: string,
  userId: string,
): Promise<DocumentResponse> {
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

  const document = results.rows[0]!;

  if (document.user_id !== userId) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar este documento.",
      action: "Verifique se você é o proprietário deste documento.",
    });
  }

  return document;
}

async function updateById(
  id: string,
  userId: string,
  input: DocumentUpdateInput,
): Promise<DocumentResponse> {
  await findOneById(id, userId);

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
  await findOneById(id, userId);

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
  findAllByUserId,
  findOneById,
  updateById,
  deleteById,
  updateSummary,
};

export default document;
