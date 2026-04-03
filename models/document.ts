import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import type {
  Document,
  DocumentPublic,
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentModel,
} from "../types/index";

async function create(input: DocumentCreateInput): Promise<DocumentPublic> {
  const result = await database.query<DocumentPublic>({
    text: `
        INSERT INTO
          documents (title, description, original_filename, storage_key, mime_type, size_bytes, page_count, user_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id, title, description, original_filename, mime_type, size_bytes::int, page_count, created_at, updated_at
        ;`,
    values: [
      input.title,
      input.description ?? null,
      input.originalFilename,
      input.storageKey,
      input.mimeType,
      input.sizeBytes,
      input.pageCount ?? null,
      input.userId,
    ],
  });

  return result.rows[0]!;
}

async function findAllByUserId(
  userId: string,
  page: number,
  limit: number,
): Promise<{ documents: DocumentPublic[]; total: number }> {
  const offset = (page - 1) * limit;

  const [docsResult, countResult] = await Promise.all([
    database.query<DocumentPublic>({
      text: `
          SELECT
            id, title, description, original_filename, mime_type, size_bytes::int, page_count, created_at, updated_at
          FROM
            documents
          WHERE
            user_id = $1
            AND deleted_at IS NULL
          ORDER BY
            created_at DESC
          LIMIT $2 OFFSET $3
          ;`,
      values: [userId, limit, offset],
    }),
    database.query<{ count: string }>({
      text: `
          SELECT COUNT(*)::text as count
          FROM documents
          WHERE user_id = $1 AND deleted_at IS NULL
          ;`,
      values: [userId],
    }),
  ]);

  return {
    documents: docsResult.rows,
    total: parseInt(countResult.rows[0]!.count, 10),
  };
}

async function findOneById(
  id: string,
  userId: string,
): Promise<DocumentPublic> {
  const result = await database.query<Document>({
    text: `
        SELECT
          id, title, description, original_filename, mime_type, size_bytes::int, page_count, user_id, created_at, updated_at
        FROM
          documents
        WHERE
          id = $1
          AND deleted_at IS NULL
        LIMIT 1
        ;`,
    values: [id],
  });

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError({
      message: "O documento informado não foi encontrado.",
      action: "Verifique se o id está correto.",
    });
  }

  const doc = result.rows[0]!;

  if (doc.user_id !== userId) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar este documento.",
      action: "Você só pode acessar os seus próprios documentos.",
    });
  }

  return doc;
}

async function updateById(
  id: string,
  userId: string,
  input: DocumentUpdateInput,
): Promise<DocumentPublic> {
  await findOneById(id, userId);

  const result = await database.query<DocumentPublic>({
    text: `
        UPDATE
          documents
        SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          updated_at = NOW()
        WHERE
          id = $3
          AND deleted_at IS NULL
        RETURNING
          id, title, description, original_filename, mime_type, size_bytes::int, page_count, created_at, updated_at
        ;`,
    values: [input.title ?? null, input.description ?? null, id],
  });

  return result.rows[0]!;
}

async function deleteById(id: string, userId: string): Promise<string> {
  const storageKeyResult = await database.query<{ storage_key: string }>({
    text: `
        SELECT storage_key FROM documents
        WHERE id = $1 AND deleted_at IS NULL
        ;`,
    values: [id],
  });

  if (!storageKeyResult.rowCount || storageKeyResult.rowCount === 0) {
    throw new NotFoundError({
      message: "O documento informado não foi encontrado.",
      action: "Verifique se o id está correto.",
    });
  }

  const doc = storageKeyResult.rows[0]!;

  // Ownership check via findOneById (throws ForbiddenError if not owner)
  await findOneById(id, userId);

  await database.query({
    text: `
        UPDATE
          documents
        SET
          deleted_at = NOW()
        WHERE
          id = $1
        ;`,
    values: [id],
  });

  return doc.storage_key;
}

const document: DocumentModel = {
  create,
  findAllByUserId,
  findOneById,
  updateById,
  deleteById,
};

export default document;
