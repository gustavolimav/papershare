"use client";

import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcher } from "@/lib/fetcher";
import type { WorkspaceWithRole } from "@/types/index";

export const WORKSPACES_KEY = "/api/v1/workspaces";

interface UseWorkspacesResult {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  isLoading: boolean;
}

// Shares one SWR key (WORKSPACES_KEY) across every component that reads or
// mutates the workspace list — activating, creating, or changing a member's
// role all revalidate this same key, so every consumer (switcher, "Enviado
// por" line, AI-feature visibility) sees the update without extra plumbing.
export function useWorkspaces(): UseWorkspacesResult {
  const { user } = useAuth();
  const { data, isLoading } = useSWR<WorkspaceWithRole[]>(
    user ? WORKSPACES_KEY : null,
    fetcher,
  );

  const workspaces = data ?? [];
  const activeWorkspace =
    workspaces.find(
      (workspace) => workspace.id === user?.active_workspace_id,
    ) ?? null;

  return { workspaces, activeWorkspace, isLoading };
}
