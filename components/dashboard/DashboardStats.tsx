"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentListResponse } from "@/types/index";

// Backend max per_page is 100 (infra/schemas.ts#paginationSchema); a single
// large page is enough to derive the stat row's aggregates without a new
// endpoint (see US-43's scope note). Workspaces past 100 documents get an
// approximation over their 100 most recent — an acceptable first cut, same
// spirit as models/document.ts's engagement_score proxy.
const STATS_PER_PAGE = 100;

interface StatCardProps {
  label: string;
  value: string;
  isLoading: boolean;
}

function StatCard({ label, value, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const { data, isLoading } = useSWR<DocumentListResponse>(
    `/api/v1/documents?page=1&per_page=${STATS_PER_PAGE}`,
    fetcher,
  );

  const documents = data?.documents ?? [];
  const totalDocuments = data?.total ?? 0;
  const activeLinks = documents.reduce(
    (sum, doc) => sum + doc.active_link_count,
    0,
  );
  const totalViews = documents.reduce((sum, doc) => sum + doc.view_count, 0);
  const avgEngagement = documents.length
    ? Math.round(
        documents.reduce((sum, doc) => sum + doc.engagement_score, 0) /
          documents.length,
      )
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Documentos"
        value={String(totalDocuments)}
        isLoading={isLoading}
      />
      <StatCard
        label="Links ativos"
        value={String(activeLinks)}
        isLoading={isLoading}
      />
      <StatCard
        label="Engajamento médio"
        value={String(avgEngagement)}
        isLoading={isLoading}
      />
      {/* All-time total, not 7-day-scoped: adding a time-boxed variant of
          the view_count subquery is a quick follow-up, but this story
          doesn't block on it (see US-43's acceptance criteria). */}
      <StatCard
        label="Visualizações totais"
        value={String(totalViews)}
        isLoading={isLoading}
      />
    </div>
  );
}
