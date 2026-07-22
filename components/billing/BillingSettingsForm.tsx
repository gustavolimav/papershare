"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import { useWorkspaces, WORKSPACES_KEY } from "@/lib/useWorkspaces";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  CheckoutSessionResponse,
  PaidSubscriptionPlan,
} from "@/types/index";

const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
  business: "Business",
} as const;

export function BillingSettingsForm() {
  const { activeWorkspace } = useWorkspaces();
  const { flags } = useFeatureFlags();
  const [pendingAction, setPendingAction] = useState<
    PaidSubscriptionPlan | "portal" | null
  >(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingEnabled = flags?.billing_stripe === true;

  useEffect(() => {
    const checkout = searchParams?.get("checkout");

    if (checkout === "success") {
      toast.success("Assinatura ativada com sucesso.");
      mutate(WORKSPACES_KEY);
      router.replace("/settings");
    } else if (checkout === "canceled") {
      router.replace("/settings");
    }
  }, [searchParams, router]);

  if (!activeWorkspace) {
    return null;
  }

  const isOwner = activeWorkspace.role === "owner";
  const isFree = activeWorkspace.plan === "free";

  async function redirectTo(
    path: string,
    action: PaidSubscriptionPlan | "portal",
    body?: object,
  ) {
    // Stripe-backed billing actions are behind a flag a superadmin has to
    // turn on (see the Feature flags tab in /settings) — off by default, so these
    // buttons send people to a "work in progress" page instead of ever
    // reaching the checkout/portal API, which would 503 the same way.
    if (!billingEnabled) {
      router.push("/em-breve");
      return;
    }

    setPendingAction(action);

    try {
      const response = await fetch(
        `/api/v1/workspaces/${activeWorkspace!.id}${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        },
      );

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(
          (responseBody as { message?: string } | null)?.message ??
            "Não foi possível continuar.",
          {
            description: (responseBody as { action?: string } | null)?.action,
          },
        );
        return;
      }

      window.location.href = (responseBody as CheckoutSessionResponse).url;
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Plano atual:</p>
        <Badge variant={isFree ? "outline" : "default"}>
          {PLAN_LABELS[activeWorkspace.plan]}
        </Badge>
      </div>

      {isFree && (
        <p className="text-sm text-muted-foreground">
          {activeWorkspace.document_count} de 10 documentos ·{" "}
          {activeWorkspace.active_link_count} de 10 links ativos
        </p>
      )}

      {isOwner && isFree && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pendingAction !== null}
            onClick={() =>
              redirectTo("/billing/checkout", "pro", { plan: "pro" })
            }
          >
            {pendingAction === "pro" ? "Redirecionando..." : "Assinar Pro"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() =>
              redirectTo("/billing/checkout", "business", {
                plan: "business",
              })
            }
          >
            {pendingAction === "business"
              ? "Redirecionando..."
              : "Assinar Business"}
          </Button>
        </div>
      )}

      {isOwner && !isFree && (
        <Button
          type="button"
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() => redirectTo("/billing/portal", "portal")}
        >
          {pendingAction === "portal"
            ? "Redirecionando..."
            : "Gerenciar assinatura"}
        </Button>
      )}
    </div>
  );
}
