"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAiKeyConfigured } from "@/lib/useAiKeyConfigured";
import type { DocumentResponse } from "@/types/index";

interface SummaryCardProps {
  doc: DocumentResponse;
  onUpdated: (doc: DocumentResponse) => void;
}

export function SummaryCard({ doc, onUpdated }: SummaryCardProps) {
  const aiConfigured = useAiKeyConfigured();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!aiConfigured) {
    return null;
  }

  async function handleRegenerate() {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/documents/${doc.id}/summary`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Não foi possível gerar o resumo.");
        return;
      }

      const { summary, generated_at } = await response.json();
      onUpdated({
        ...doc,
        ai_summary: summary,
        ai_summary_generated_at: generated_at,
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" /> Resumo gerado por IA
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          aria-label="Gerar novo resumo"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm">
            {doc.ai_summary ?? "Nenhum resumo disponível ainda."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
