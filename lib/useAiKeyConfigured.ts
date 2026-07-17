"use client";

import { useWorkspaces } from "@/lib/useWorkspaces";

// Checks the *active workspace's* AI configuration (its creator's key),
// not the logged-in user's own — a viewer/editor in a team workspace whose
// creator configured a key should still see AI features, even though they
// never configured anything themselves. Shares useWorkspaces()'s SWR cache,
// so saving/removing a key (which the creator does from their own
// Configurações — AiSettingsForm's own key, unchanged by this hook) is
// reflected here once that workspace entry is revalidated.
export function useAiKeyConfigured(): boolean {
  const { activeWorkspace } = useWorkspaces();

  return activeWorkspace?.ai_configured ?? false;
}
