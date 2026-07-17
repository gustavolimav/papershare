import database from "../infra/database";
import ai from "../infra/ai";
import document from "./document";
import linkView from "./linkView";
import aiUsage from "./aiUsage";
import user from "./user";
import type {
  AnalyticsInsightResponse,
  DocumentAnalyticsResponse,
  PageBreakdown,
  Suggestion,
} from "../types/index";

// Below this many total views there isn't enough signal to draw drop-off
// or engagement conclusions from — an empty suggestions array is more
// honest than a suggestion based on 1-2 data points.
const MIN_VIEWS_FOR_SUGGESTIONS = 5;

// Only counts against regenerations (cache misses) — a cache hit never
// calls the API, so it never counts here either.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REGENERATE_LIMIT_PER_DAY = 10;

interface InsightCacheRow {
  ai_insight: string | null;
  ai_insight_suggestions: Suggestion[] | null;
  ai_insight_generated_at: Date | null;
  ai_insight_total_views: number | null;
  ai_insight_last_viewed_at: Date | null;
}

async function getInsights(
  documentId: string,
  userId: string,
): Promise<AnalyticsInsightResponse> {
  const doc = await document.findOneById(documentId, userId);
  const analytics = await linkView.getAnalyticsByDocumentId(documentId);

  if (analytics.total_views === 0) {
    return {
      insight: "Nenhuma visualização ainda para gerar insights.",
      suggestions: [],
      generated_at: null,
    };
  }

  const cache = await getCacheRow(documentId);

  if (isCacheValid(cache, analytics)) {
    return {
      insight: cache.ai_insight,
      suggestions: cache.ai_insight_suggestions ?? [],
      generated_at: cache.ai_insight_generated_at,
    };
  }

  await aiUsage.checkAndRecord(
    documentId,
    "insight_regenerate",
    REGENERATE_LIMIT_PER_DAY,
    ONE_DAY_MS,
  );

  const pageBreakdown = await linkView.getPageBreakdownByDocumentId(documentId);
  const apiKey = await user.getAiApiKey(userId);
  const generated = await generateInsight(
    apiKey,
    doc.title,
    doc.page_count,
    analytics,
    pageBreakdown,
  );

  if (!generated) {
    // AI unavailable (owner hasn't configured a key) — fall back to
    // whatever is cached (possibly all null) rather than throwing, since
    // this is a read-mostly endpoint the analytics page polls.
    return {
      insight: cache.ai_insight,
      suggestions: cache.ai_insight_suggestions ?? [],
      generated_at: cache.ai_insight_generated_at,
    };
  }

  return await saveCacheRow(documentId, generated, analytics);
}

function isCacheValid(
  cache: InsightCacheRow,
  analytics: DocumentAnalyticsResponse,
): boolean {
  if (cache.ai_insight === null) {
    return false;
  }

  if (cache.ai_insight_total_views !== analytics.total_views) {
    return false;
  }

  return sameTimestamp(
    cache.ai_insight_last_viewed_at,
    analytics.last_viewed_at,
  );
}

function sameTimestamp(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return new Date(a).getTime() === new Date(b).getTime();
}

async function generateInsight(
  apiKey: string | null,
  documentTitle: string,
  pageCount: number | null,
  analytics: DocumentAnalyticsResponse,
  pageBreakdown: PageBreakdown[],
): Promise<{ insight: string; suggestions: Suggestion[] } | null> {
  const hasEnoughForSuggestions =
    analytics.total_views >= MIN_VIEWS_FOR_SUGGESTIONS;

  const data = JSON.stringify({
    document_title: documentTitle,
    page_count: pageCount,
    total_views: analytics.total_views,
    unique_viewers: analytics.unique_viewers,
    avg_time_on_page_seconds: analytics.avg_time_on_page,
    avg_pages_viewed: analytics.avg_pages_viewed,
    top_links: analytics.top_links,
    page_breakdown: pageBreakdown,
  });

  const raw = await ai.complete({
    apiKey,
    system: `Você é um assistente de analytics para donos de documentos compartilhados. Responda sempre em português do Brasil (pt-BR), como JSON válido e apenas o JSON, no formato exato: {"insight": string, "suggestions": Array<{"type": "drop_off" | "engagement", "message": string, "page_number": number | null}>}. O campo "insight" deve ter de 3 a 5 frases resumindo as métricas de forma natural, destacando as tendências mais notáveis (pico de atividade, link com mais tráfego, tempo médio de leitura comparado ao esperado). ${
      hasEnoughForSuggestions
        ? 'O campo "suggestions" deve conter até 3 sugestões acionáveis baseadas em "page_breakdown" (onde os leitores param de ler) e no tempo médio de leitura — use "type": "drop_off" quando a sugestão for sobre abandono em uma página específica (preencha "page_number") e "type": "engagement" quando for sobre tempo de leitura baixo ("page_number": null).'
        : 'Como há poucas visualizações (menos de 5), retorne "suggestions" como um array vazio — não há dados suficientes para sugestões confiáveis.'
    }`,
    prompt: `Dados de analytics do documento:\n\n${data}`,
    maxTokens: 1024,
  });

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      insight: typeof parsed.insight === "string" ? parsed.insight : "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    // Malformed JSON from the model — treat the same as "unavailable"
    // rather than surfacing broken data to the owner.
    return null;
  }
}

async function getCacheRow(documentId: string): Promise<InsightCacheRow> {
  const results = await database.query<InsightCacheRow>({
    text: `
        SELECT
          ai_insight, ai_insight_suggestions, ai_insight_generated_at,
          ai_insight_total_views, ai_insight_last_viewed_at
        FROM
          documents
        WHERE
          id = $1
        ;`,
    values: [documentId],
  });

  return results.rows[0]!;
}

async function saveCacheRow(
  documentId: string,
  generated: { insight: string; suggestions: Suggestion[] },
  analytics: DocumentAnalyticsResponse,
): Promise<AnalyticsInsightResponse> {
  const results = await database.query<{ ai_insight_generated_at: Date }>({
    text: `
        UPDATE
          documents
        SET
          ai_insight = $1,
          ai_insight_suggestions = $2,
          ai_insight_generated_at = NOW(),
          ai_insight_total_views = $3,
          ai_insight_last_viewed_at = $4
        WHERE
          id = $5
        RETURNING
          ai_insight_generated_at
        ;`,
    values: [
      generated.insight,
      JSON.stringify(generated.suggestions),
      analytics.total_views,
      analytics.last_viewed_at,
      documentId,
    ],
  });

  return {
    insight: generated.insight,
    suggestions: generated.suggestions,
    generated_at: results.rows[0]!.ai_insight_generated_at,
  };
}

const analyticsInsights = { getInsights };

export default analyticsInsights;
