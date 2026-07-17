"use client";

import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SuggestionList } from "@/components/analytics/SuggestionList";
import { useAiKeyConfigured } from "@/lib/useAiKeyConfigured";
import type { AnalyticsInsightResponse } from "@/types/index";

interface InsightCardProps {
  documentId: string;
}

export function InsightCard({ documentId }: InsightCardProps) {
  const aiConfigured = useAiKeyConfigured();
  const { data, isLoading } = useSWR<AnalyticsInsightResponse>(
    aiConfigured ? `/api/v1/documents/${documentId}/analytics/insights` : null,
    fetcher,
  );

  if (!aiConfigured || isLoading || !data?.insight) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" /> Insight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{data.insight}</p>
        {data.suggestions.length > 0 && (
          <SuggestionList suggestions={data.suggestions} />
        )}
      </CardContent>
    </Card>
  );
}
