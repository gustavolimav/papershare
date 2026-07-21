"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { FEATURE_FLAGS_KEY } from "@/lib/useFeatureFlags";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FEATURE_FLAG_KEYS } from "@/types/index";
import type { FeatureFlagKey, FeatureFlagsResponse } from "@/types/index";

const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  billing_stripe: "Cobrança (Stripe)",
};

const FEATURE_FLAG_DESCRIPTIONS: Record<FeatureFlagKey, string> = {
  billing_stripe:
    'Habilita os botões de assinar/gerenciar plano na aba Faturamento. Desligado, esses botões levam a uma página de "em breve" e o checkout/portal da API recusa com 503.',
};

export function FeatureFlagsPanel() {
  const { data, error, isLoading, mutate } = useSWR<FeatureFlagsResponse>(
    FEATURE_FLAGS_KEY,
    fetcher,
  );
  const [pendingKey, setPendingKey] = useState<FeatureFlagKey | null>(null);

  async function handleToggle(key: FeatureFlagKey, enabled: boolean) {
    setPendingKey(key);

    try {
      const response = await fetch(`/api/v1/feature-flags/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.message ?? "Não foi possível atualizar a flag.");
        return;
      }

      await mutate();
      toast.success(
        `${FEATURE_FLAG_LABELS[key]} ${enabled ? "ativada" : "desativada"}.`,
      );
    } finally {
      setPendingKey(null);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (error || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar as feature flags.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {FEATURE_FLAG_KEYS.map((key) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor={`flag-${key}`}>{FEATURE_FLAG_LABELS[key]}</Label>
            <p className="text-xs text-muted-foreground">
              {FEATURE_FLAG_DESCRIPTIONS[key]}
            </p>
          </div>
          <Switch
            id={`flag-${key}`}
            checked={data[key]}
            disabled={pendingKey === key}
            onCheckedChange={(checked) => handleToggle(key, checked)}
          />
        </div>
      ))}
    </div>
  );
}
