"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { StatCard } from "@/components/analytics/StatCard";
import { ViewsChart } from "@/components/analytics/ViewsChart";
import { TopLinksTable } from "@/components/analytics/TopLinksTable";
import { LinkAnalyticsDrawer } from "@/components/analytics/LinkAnalyticsDrawer";
import { InsightCard } from "@/components/analytics/InsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/formatters";
import type { DocumentAnalyticsResponse, TopLink } from "@/types/index";

interface AnalyticsViewProps {
  documentId: string;
}

export function AnalyticsView({ documentId }: AnalyticsViewProps) {
  const [selectedLink, setSelectedLink] = useState<TopLink | null>(null);

  const { data, error, isLoading } = useSWR<DocumentAnalyticsResponse>(
    `/api/v1/documents/${documentId}/analytics`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar as métricas.
      </p>
    );
  }

  if (data.total_views === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nenhuma visualização ainda. Compartilhe um link para começar a rastrear.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de visualizações" value={data.total_views} />
        <StatCard label="Visitantes únicos" value={data.unique_viewers} />
        <StatCard
          label="Tempo médio na página"
          value={formatDuration(data.avg_time_on_page)}
        />
        <StatCard
          label="Páginas médias vistas"
          value={data.avg_pages_viewed?.toFixed(1) ?? "—"}
        />
      </div>

      <InsightCard documentId={documentId} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Visualizações por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <ViewsChart data={data.views_by_day} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Top links</CardTitle>
        </CardHeader>
        <CardContent>
          <TopLinksTable links={data.top_links} onLinkClick={setSelectedLink} />
        </CardContent>
      </Card>

      <LinkAnalyticsDrawer
        documentId={documentId}
        linkId={selectedLink?.link_id ?? null}
        linkLabel={selectedLink?.label ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLink(null);
          }
        }}
      />
    </div>
  );
}
