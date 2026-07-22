import crypto from "crypto";
import database from "../infra/database";
import { NotFoundError, PaymentRequiredError } from "../infra/errors";
import workspace from "./workspace";
import subscription from "./subscription";
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

// Free-plan workspaces are capped at the free tier's maxDocuments limit;
// Pro/Business have no limit (maxDocuments === null). Existing documents past
// the cap (e.g. after a downgrade) are left untouched — only creating a
// new one is blocked.
async function assertWithinDocumentLimit(workspaceId: string): Promise<void> {
  const plan = await subscription.getPlanForWorkspace(workspaceId);
  const { maxDocuments } = subscription.PLAN_LIMITS[plan];

  if (maxDocuments === null) {
    return;
  }

  const results = await database.query<{ count: string }>({
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
  });

  if (Number(results.rows[0]!.count) >= maxDocuments) {
    throw new PaymentRequiredError({
      message: `Limite de ${maxDocuments} documentos do plano Free atingido.`,
      action: "Faça upgrade do workspace para o plano Pro para continuar.",
    });
  }
}

async function create(input: DocumentCreateInput): Promise<DocumentResponse> {
  // input.user_id is always the acting/authenticated user (the uploader),
  // never someone else's id on their behalf — same value doubles as the
  // audit field on the inserted row and the identity checked here.
  await workspace.requireRole(input.workspace_id, input.user_id, "editor");
  await assertWithinDocumentLimit(input.workspace_id);

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
    database.query<
      Document & {
        uploaded_by_username: string;
        view_count: number;
        active_link_count: number;
        engagement_score: number;
      }
    >({
      text: `
          SELECT
            documents.id, documents.title, documents.description,
            documents.original_filename, documents.storage_key,
            documents.mime_type, documents.size_bytes, documents.page_count,
            documents.user_id, documents.workspace_id, documents.ai_summary,
            documents.ai_summary_generated_at, documents.created_at,
            documents.updated_at, documents.deleted_at,
            users.username AS uploaded_by_username,
            (
              SELECT COUNT(*)::int FROM link_views lv
              JOIN share_links sl ON sl.id = lv.share_link_id
              WHERE sl.document_id = documents.id
            ) AS view_count,
            (
              SELECT COUNT(*)::int FROM share_links sl2
              WHERE sl2.document_id = documents.id AND sl2.is_active = true
            ) AS active_link_count,
            (
              -- Proxy for models/linkView.ts#computeEngagementScore, which is a
              -- per-viewer formula (needs fingerprint grouping) that doesn't
              -- reduce cleanly to one document-level subquery. Simpler first
              -- cut, as allowed by US-43: average time_on_page across every
              -- view of the document's links, normalized against the same
              -- 120s "full marks" target that formula's time axis uses
              -- (ENGAGEMENT_TIME_TARGET_SECONDS), capped at 100.
              -- CASE, not COALESCE(LEAST(...), 0): Postgres's LEAST/GREATEST
              -- ignore NULL arguments instead of propagating them, so
              -- LEAST(100, NULL) evaluates to 100 — the no-views case must
              -- be handled explicitly instead.
              SELECT
                CASE
                  WHEN AVG(lv2.time_on_page) IS NULL THEN 0
                  ELSE LEAST(100, ROUND(AVG(lv2.time_on_page) / 1.2))::int
                END
              FROM link_views lv2
              JOIN share_links sl3 ON sl3.id = lv2.share_link_id
              WHERE
                sl3.document_id = documents.id
                AND lv2.time_on_page IS NOT NULL
            ) AS engagement_score
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
