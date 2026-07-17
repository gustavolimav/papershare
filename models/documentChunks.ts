import database from "../infra/database";
import storage from "../infra/storage";
import { extractText } from "./textExtraction";

export interface DocumentChunk {
  page_number: number;
  content: string;
}

async function getChunks(documentId: string): Promise<DocumentChunk[]> {
  const results = await database.query<DocumentChunk>({
    text: `
        SELECT
          page_number, content
        FROM
          document_chunks
        WHERE
          document_id = $1
        ORDER BY
          page_number
        ;`,
    values: [documentId],
  });

  return results.rows;
}

// Populated lazily on first chat request rather than at upload time — most
// shared links are never chatted with, so extracting/storing chunks
// unconditionally on every upload would be wasted work for the common case.
async function ensureChunks(documentId: string): Promise<DocumentChunk[]> {
  const existing = await getChunks(documentId);

  if (existing.length > 0) {
    return existing;
  }

  const docResult = await database.query<{
    storage_key: string;
    mime_type: string;
  }>({
    text: `
        SELECT
          storage_key, mime_type
        FROM
          documents
        WHERE
          id = $1
          AND deleted_at IS NULL
        ;`,
    values: [documentId],
  });

  if (!docResult.rowCount) {
    return [];
  }

  const { storage_key, mime_type } = docResult.rows[0]!;
  const { body } = await storage.getFile(storage_key);
  const extracted = await extractText(mime_type, body);

  if (!extracted) {
    return [];
  }

  for (const page of extracted.pages) {
    await database.query({
      text: `
          INSERT INTO
            document_chunks (document_id, page_number, content)
          VALUES
            ($1, $2, $3)
          ON CONFLICT
            (document_id, page_number)
          DO NOTHING
          ;`,
      values: [documentId, page.page_number, page.text],
    });
  }

  return extracted.pages.map((page) => ({
    page_number: page.page_number,
    content: page.text,
  }));
}

const WORD_MIN_LENGTH = 3;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= WORD_MIN_LENGTH),
  );
}

// No vector DB for this MVP: a plain keyword-overlap count between the
// question and each page's text is enough to pick out the most relevant
// pages for a chat answer, without an embeddings pipeline.
function findRelevantChunks(
  chunks: DocumentChunk[],
  question: string,
  topN = 5,
): DocumentChunk[] {
  if (chunks.length <= topN) {
    return chunks;
  }

  const questionWords = tokenize(question);

  return chunks
    .map((chunk) => {
      const chunkWords = tokenize(chunk.content);
      let score = 0;
      for (const word of questionWords) {
        if (chunkWords.has(word)) {
          score++;
        }
      }
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((scored) => scored.chunk);
}

const documentChunks = { getChunks, ensureChunks, findRelevantChunks };

export default documentChunks;
