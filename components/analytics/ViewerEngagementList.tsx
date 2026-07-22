"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Mail, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatDate } from "@/lib/formatters";
import { useAiKeyConfigured } from "@/lib/useAiKeyConfigured";
import type { FollowUpEmailSuggestion, ViewerEngagement } from "@/types/index";

interface ViewerEngagementListProps {
  documentId: string;
  linkId: string;
  viewers: ViewerEngagement[];
}

// Soft-tinted badge (border + bg-at-15%-opacity + solid text), same
// treatment as the destructive Badge variant already uses — keeps the
// score readable against both light and dark card backgrounds since each
// --score-* token already carries its own light/dark value.
function scoreBadgeClass(score: number): string {
  if (score >= 70) {
    return "border-score-good/20 bg-score-good/15 text-score-good";
  }
  if (score >= 40) {
    return "border-score-warn/20 bg-score-warn/15 text-score-warn";
  }
  return "border-score-critical/20 bg-score-critical/15 text-score-critical";
}

function initialFor(viewer: ViewerEngagement): string {
  const source = viewer.viewer_name ?? viewer.viewer_email;
  return source?.trim()[0]?.toUpperCase() ?? "?";
}

export function ViewerEngagementList({
  documentId,
  linkId,
  viewers,
}: ViewerEngagementListProps) {
  const aiConfigured = useAiKeyConfigured();

  if (viewers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum visitante ainda.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Ordenado por pontuação de engajamento — combina tempo de leitura, % de
        páginas vistas, número de visitas e download.
      </p>
      {viewers.map((viewer, index) => (
        <ViewerRow
          key={`${viewer.viewer_fingerprint ?? viewer.viewer_email ?? viewer.viewer_name ?? "anon"}-${index}`}
          documentId={documentId}
          linkId={linkId}
          viewer={viewer}
          aiConfigured={aiConfigured}
        />
      ))}
    </div>
  );
}

interface ViewerRowProps {
  documentId: string;
  linkId: string;
  viewer: ViewerEngagement;
  aiConfigured: boolean;
}

function ViewerRow({
  documentId,
  linkId,
  viewer,
  aiConfigured,
}: ViewerRowProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<FollowUpEmailSuggestion | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSuggest() {
    if (!viewer.viewer_fingerprint) {
      return;
    }

    setIsSuggesting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/documents/${documentId}/links/${linkId}/followup-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            viewer_fingerprint: viewer.viewer_fingerprint,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Não foi possível gerar a sugestão.");
        return;
      }

      setSuggestion(await response.json());
    } finally {
      setIsSuggesting(false);
    }
  }

  function handleCopy() {
    if (!suggestion) {
      return;
    }
    navigator.clipboard.writeText(
      `${suggestion.subject}\n\n${suggestion.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            {initialFor(viewer)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {viewer.viewer_name ?? viewer.viewer_email ?? "Visitante anônimo"}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{formatDuration(viewer.total_time_on_page)}</span>
              <span>·</span>
              <span>{viewer.max_pages_viewed} página(s)</span>
              <span>·</span>
              <span>
                {viewer.visit_count}{" "}
                {viewer.visit_count === 1 ? "visita" : "visitas"}
              </span>
              <span>·</span>
              <span>Última vez em {formatDate(viewer.last_viewed_at)}</span>
              {viewer.downloaded && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Download className="h-3 w-3" /> Baixou
                </span>
              )}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 font-medium",
            scoreBadgeClass(viewer.engagement_score),
          )}
        >
          {viewer.engagement_score}
        </Badge>
      </div>

      {aiConfigured && viewer.viewer_fingerprint && (
        <div className="mt-2">
          {!suggestion && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggest}
              disabled={isSuggesting}
            >
              <Mail className="mr-1 h-3.5 w-3.5" />
              {isSuggesting ? "Gerando..." : "Gerar follow-up"}
            </Button>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {suggestion && (
            <div className="mt-2 space-y-2 rounded-md bg-muted/30 p-3 text-sm">
              <p className="font-medium">{suggestion.subject}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {suggestion.body}
              </p>
              {!suggestion.viewer_email && (
                <p className="text-xs text-muted-foreground">
                  Nenhum e-mail registrado para este visitante — copie e envie
                  manualmente.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
