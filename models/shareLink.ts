import database from "../infra/database";
import { NotFoundError, ForbiddenError } from "../infra/errors";
import passwordModel from "./password";
import documentModel from "./document";
import type {
  ShareLink,
  ShareLinkPublic,
  ShareLinkCreateInput,
  ShareLinkUpdateInput,
  ShareLinkWithDocument,
  ShareLinkModel,
  DocumentPublic,
} from "../types/index";

const LINK_PUBLIC_COLUMNS = `
  id, token, document_id, label, expires_at, allow_download, is_active, created_at, updated_at
`;

async function create(input: ShareLinkCreateInput): Promise<ShareLinkPublic> {
  await documentModel.findOneById(input.documentId, input.userId);

  const passwordHash = input.password
    ? await passwordModel.hash(input.password)
    : null;

  const result = await database.query<ShareLinkPublic>({
    text: `
        INSERT INTO
          share_links (document_id, user_id, label, password_hash, expires_at, allow_download)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING
          ${LINK_PUBLIC_COLUMNS}
        ;`,
    values: [
      input.documentId,
      input.userId,
      input.label ?? null,
      passwordHash,
      input.expiresAt ?? null,
      input.allowDownload ?? true,
    ],
  });

  return result.rows[0]!;
}

async function findAllByDocumentId(
  documentId: string,
  userId: string,
): Promise<ShareLinkPublic[]> {
  await documentModel.findOneById(documentId, userId);

  const result = await database.query<ShareLinkPublic>({
    text: `
        SELECT
          ${LINK_PUBLIC_COLUMNS}
        FROM
          share_links
        WHERE
          document_id = $1
        ORDER BY
          created_at DESC
        ;`,
    values: [documentId],
  });

  return result.rows;
}

async function findOneById(
  id: string,
  documentId: string,
  userId: string,
): Promise<ShareLinkPublic> {
  await documentModel.findOneById(documentId, userId);

  const result = await database.query<ShareLinkPublic>({
    text: `
        SELECT
          ${LINK_PUBLIC_COLUMNS}
        FROM
          share_links
        WHERE
          id = $1
          AND document_id = $2
        LIMIT 1
        ;`,
    values: [id, documentId],
  });

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError({
      message: "O link de compartilhamento informado não foi encontrado.",
      action: "Verifique se o id está correto.",
    });
  }

  return result.rows[0]!;
}

async function getByToken(
  token: string,
  providedPassword?: string,
): Promise<ShareLinkWithDocument> {
  const linkResult = await database.query<ShareLink>({
    text: `
        SELECT
          id, token, document_id, user_id, label, password_hash,
          expires_at, allow_download, is_active, created_at, updated_at
        FROM
          share_links
        WHERE
          token = $1
        LIMIT 1
        ;`,
    values: [token],
  });

  if (!linkResult.rowCount || linkResult.rowCount === 0) {
    throw new NotFoundError({
      message: "O link de compartilhamento informado não foi encontrado.",
      action: "Verifique se o token está correto.",
    });
  }

  const link = linkResult.rows[0]!;

  if (!link.is_active) {
    throw new ForbiddenError({
      message: "Este link de compartilhamento foi revogado.",
      action: "Solicite um novo link ao proprietário do documento.",
    });
  }

  if (link.expires_at && new Date() > new Date(link.expires_at)) {
    throw new ForbiddenError({
      message: "Este link de compartilhamento expirou.",
      action: "Solicite um novo link ao proprietário do documento.",
    });
  }

  if (link.password_hash) {
    if (!providedPassword) {
      throw new ForbiddenError({
        message: "Este link requer uma senha.",
        action: "Forneça a senha no parâmetro 'password'.",
      });
    }
    const isValid = await passwordModel.compare(
      providedPassword,
      link.password_hash,
    );
    if (!isValid) {
      throw new ForbiddenError({
        message: "Senha incorreta.",
        action: "Verifique a senha e tente novamente.",
      });
    }
  }

  const docResult = await database.query<DocumentPublic>({
    text: `
        SELECT
          id, title, description, original_filename, mime_type,
          size_bytes::int, page_count, created_at, updated_at
        FROM
          documents
        WHERE
          id = $1
          AND deleted_at IS NULL
        LIMIT 1
        ;`,
    values: [link.document_id],
  });

  if (!docResult.rowCount || docResult.rowCount === 0) {
    throw new NotFoundError({
      message: "O documento associado a este link não foi encontrado.",
      action: "O documento pode ter sido removido.",
    });
  }

  // eslint-disable-next-line no-unused-vars
  const { password_hash: _ph, user_id: _ui, ...linkPublic } = link;

  return {
    link: linkPublic as ShareLinkPublic,
    document: docResult.rows[0]!,
  };
}

async function updateById(
  id: string,
  documentId: string,
  userId: string,
  input: ShareLinkUpdateInput,
): Promise<ShareLinkPublic> {
  await findOneById(id, documentId, userId);

  const setParts: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.label !== undefined) {
    setParts.push(`label = $${idx++}`);
    values.push(input.label);
  }

  if (input.password !== undefined) {
    const hash =
      input.password === null ? null : await passwordModel.hash(input.password);
    setParts.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (input.expiresAt !== undefined) {
    setParts.push(`expires_at = $${idx++}`);
    values.push(input.expiresAt ?? null);
  }

  if (input.allowDownload !== undefined) {
    setParts.push(`allow_download = $${idx++}`);
    values.push(input.allowDownload);
  }

  if (input.isActive !== undefined) {
    setParts.push(`is_active = $${idx++}`);
    values.push(input.isActive);
  }

  setParts.push(`updated_at = NOW()`);
  values.push(id);

  const result = await database.query<ShareLinkPublic>({
    text: `
        UPDATE
          share_links
        SET
          ${setParts.join(",\n          ")}
        WHERE
          id = $${idx}
        RETURNING
          ${LINK_PUBLIC_COLUMNS}
        ;`,
    values,
  });

  return result.rows[0]!;
}

async function deleteById(
  id: string,
  documentId: string,
  userId: string,
): Promise<void> {
  await findOneById(id, documentId, userId);

  await database.query({
    text: `
        UPDATE
          share_links
        SET
          is_active = FALSE,
          updated_at = NOW()
        WHERE
          id = $1
        ;`,
    values: [id],
  });
}

const shareLink: ShareLinkModel = {
  create,
  findAllByDocumentId,
  findOneById,
  getByToken,
  updateById,
  deleteById,
};

export default shareLink;
