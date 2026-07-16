import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { formatDuration, formatDate } from "@/lib/formatters";
import type { ViewerEngagement } from "@/types/index";

interface ViewerEngagementListProps {
  viewers: ViewerEngagement[];
}

function scoreBadgeVariant(score: number): "default" | "secondary" | "outline" {
  if (score >= 70) {
    return "default";
  }
  if (score >= 40) {
    return "secondary";
  }
  return "outline";
}

export function ViewerEngagementList({ viewers }: ViewerEngagementListProps) {
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
        <div
          key={`${viewer.viewer_email ?? viewer.viewer_name ?? "anon"}-${index}`}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
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
          <Badge variant={scoreBadgeVariant(viewer.engagement_score)}>
            {viewer.engagement_score}
          </Badge>
        </div>
      ))}
    </div>
  );
}
