"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/analytics/StatCard";
import { ViewsChart } from "@/components/analytics/ViewsChart";
import { PageHeatmapChart } from "@/components/analytics/PageHeatmapChart";
import { ViewerEngagementList } from "@/components/analytics/ViewerEngagementList";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/formatters";
import type { LinkAnalyticsResponse } from "@/types/index";

interface LinkAnalyticsDrawerProps {
  documentId: string;
  linkId: string | null;
  linkLabel: string | null;
  onOpenChange: (open: boolean) => void;
}

export function LinkAnalyticsDrawer({
  documentId,
  linkId,
  linkLabel,
  onOpenChange,
}: LinkAnalyticsDrawerProps) {
  const { data, isLoading } = useSWR<LinkAnalyticsResponse>(
    linkId ? `/api/v1/documents/${documentId}/links/${linkId}/analytics` : null,
    fetcher,
  );

  return (
    <Dialog open={linkId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{linkLabel ?? "Sem rótulo"}</DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {isLoading && <Skeleton className="h-64 w-full" />}

          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Visualizações" value={data.total_views} />
                <StatCard
                  label="Visitantes únicos"
                  value={data.unique_viewers}
                />
                <StatCard
                  label="Tempo médio"
                  value={formatDuration(data.avg_time_on_page)}
                />
                <StatCard
                  label="Páginas médias"
                  value={data.avg_pages_viewed?.toFixed(1) ?? "—"}
                />
              </div>
              <ViewsChart data={data.views_by_day} />
              {data.page_breakdown.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Tempo médio por página
                  </h3>
                  <PageHeatmapChart data={data.page_breakdown} />
                </div>
              )}
              {data.viewers && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Engajamento por visitante
                  </h3>
                  <ViewerEngagementList
                    documentId={documentId}
                    linkId={linkId!}
                    viewers={data.viewers}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
