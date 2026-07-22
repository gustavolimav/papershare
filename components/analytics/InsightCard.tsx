"use client";

import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Insight da IA:</span> {data.insight}
          </p>
          {data.suggestions.length > 0 && (
            <SuggestionList suggestions={data.suggestions} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
