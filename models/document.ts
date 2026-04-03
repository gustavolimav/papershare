import database from "../infra/database";
import { ForbiddenError, NotFoundError } from "../infra/errors";
import type {
  Document,
  DocumentCreateInput,
  DocumentModel,
  DocumentPublic,
  DocumentUpdateInput,
} from "../types/index";

const PUBLIC_COLUMNS = `
  id, title, description, original_filename, mime_type,
  size_bytes, page_count, user_id, created_at, updated_at
`;

async function create(input: DocumentCreateInput): Promise<DocumentPublic> {
  const result = await database.query<DocumentPublic>({
    text: `
        INSERT INTO
          documents (title, description, original_filename, storage_key, mime_type, size_bytes, page_count, user_id)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          ${PUBLIC_COLUMNS}
        ;`,
    values: [
      input.title,
      input.description ?? null,
      input.original_filename,
      input.storage_key,
      input.mime_type,
      input.size_bytes,
      input.page_count ?? null,
      input.user_id,
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
            ${PUBLIC_COLUMNS}
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
      values: [userId, limit, offset],
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
    documents: docsResult.rows,
    total: parseInt(countResult.rows[0]!.count, 10),
  };
}

async function findOneById(id: string): Promise<Document> {
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
      action: "Verifique se o id está correto.",
    });
  }

  return result.rows[0]!;
}

async function updateById(
  id: string,
  userId: string,
  input: DocumentUpdateInput,
): Promise<DocumentPublic> {
  const doc = await findOneById(id);

  if (doc.user_id !== userId) {
    throw new ForbiddenError({
      message: "Você não tem permissão para atualizar este documento.",
      action: "Você só pode atualizar os seus próprios documentos.",
    });
  }

  const updated = {
    title: input.title ?? doc.title,
    description:
      "description" in input ? (input.description ?? null) : doc.description,
  };

  const result = await database.query<DocumentPublic>({
    text: `
        UPDATE
          documents
        SET
          title = $1,
          description = $2,
          updated_at = NOW()
        WHERE
          id = $3
          AND deleted_at IS NULL
        RETURNING
          ${PUBLIC_COLUMNS}
        ;`,
    values: [updated.title, updated.description, id],
  });

  return result.rows[0]!;
}

async function deleteById(id: string, userId: string): Promise<void> {
  const doc = await findOneById(id);

  if (doc.user_id !== userId) {
    throw new ForbiddenError({
      message: "Você não tem permissão para deletar este documento.",
      action: "Você só pode deletar os seus próprios documentos.",
    });
  }

  await database.query({
    text: `
        UPDATE
          documents
        SET
          deleted_at = NOW()
        WHERE
          id = $1
          AND deleted_at IS NULL
        ;`,
    values: [id],
  });
}

const document: DocumentModel = {
  create,
  findAllByUserId,
  findOneById,
  updateById,
  deleteById,
};

export default document;
