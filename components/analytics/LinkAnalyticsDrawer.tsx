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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{linkLabel ?? "Sem rótulo"}</DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-64 w-full" />}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Visualizações" value={data.total_views} />
              <StatCard label="Visitantes únicos" value={data.unique_viewers} />
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
