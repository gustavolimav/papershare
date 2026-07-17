"use client";

import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";
import type { AiKeyStatusResponse } from "@/types/index";

// Shares the same SWR key as AiSettingsForm.tsx, so saving/removing a key
// there invalidates this everywhere else it's read (dashboard, analytics,
// viewer engagement list) without a dedicated global-state layer.
export function useAiKeyConfigured(): boolean {
  const { user } = useAuth();
  const { data } = useSWR<AiKeyStatusResponse>(
    user ? `/api/v1/users/${user.username}/ai-key` : null,
    fetcher,
  );

  return data?.configured ?? false;
}
