import { toast } from "sonner";

// A 402 (PaymentRequiredError) can still slip past proactive UI gating —
// e.g. a stale SWR cache across tabs — so every gated write surfaces it here
// as a fallback instead of a silent or purely inline failure.
export function toastPaymentRequired(
  status: number,
  body: { message?: string; action?: string } | null,
): boolean {
  if (status !== 402) {
    return false;
  }

  toast.error(body?.message ?? "Recurso do plano Pro.", {
    description: body?.action,
  });

  return true;
}
