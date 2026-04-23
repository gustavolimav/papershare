import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import type {
  Document,
  DocumentCreateInput,
  DocumentListResponse,
  DocumentModel,
  DocumentResponse,
  DocumentUpdateInput,
} from "../types/index";

function toDocumentResponse(doc: Document): DocumentResponse {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    original_filename: doc.original_filename,
    storage_key: doc.storage_key,
    mime_type: doc.mime_type,
    size_bytes: doc.size_bytes,
    page_count: doc.page_count,
    user_id: doc.user_id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

async function create(input: DocumentCreateInput): Promise<DocumentResponse> {
  const result = await database.query<Document>({
    text: `
        INSERT INTO
          documents (
            id,
            title,
            description,
            original_filename,
            storage_key,
            mime_type,
            size_bytes,
            page_count,
            user_id
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          *
        ;`,
    values: [
      input.id,
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

  return toDocumentResponse(result.rows[0]!);
}

async function findAllByUserId(
  userId: string,
  page: number,
  perPage: number,
): Promise<DocumentListResponse> {
  const offset = (page - 1) * perPage;

  const countResult = await database.query<{ count: string }>({
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
  });

  const total = parseInt(countResult.rows[0]!.count, 10);

  const docsResult = await database.query<Document>({
    text: `
        SELECT
          *
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
    values: [userId, perPage, offset],
  });

  return {
    documents: docsResult.rows.map(toDocumentResponse),
    total,
  };
}

async function findOneById(
  id: string,
  userId: string,
): Promise<DocumentResponse> {
  const result = await database.query<Document>({
    text: `
        SELECT
          *
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

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError({
      message: "O documento informado não foi encontrado.",
      action: "Verifique se o id do documento está correto.",
    });
  }

  const doc = result.rows[0]!;

  if (doc.user_id !== userId) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar este documento.",
      action: "Você só pode acessar os seus próprios documentos.",
    });
  }

  return toDocumentResponse(doc);
}

async function updateById(
  id: string,
  userId: string,
  input: DocumentUpdateInput,
): Promise<DocumentResponse> {
  await findOneById(id, userId);

  const result = await database.query<Document>({
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
          *
        ;`,
    values: [input.title ?? null, input.description ?? null, id],
  });

  return toDocumentResponse(result.rows[0]!);
}

async function deleteById(id: string, userId: string): Promise<string> {
  await findOneById(id, userId);

  const result = await database.query<Pick<Document, "storage_key">>({
    text: `
        UPDATE
          documents
        SET
          deleted_at = NOW()
        WHERE
          id = $1
          AND deleted_at IS NULL
        RETURNING
          storage_key
        ;`,
    values: [id],
  });

  return result.rows[0]!.storage_key;
}

const document: DocumentModel = {
  create,
  findAllByUserId,
  findOneById,
  updateById,
  deleteById,
};

export default document;
