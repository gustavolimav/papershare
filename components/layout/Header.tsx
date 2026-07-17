"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceModal } from "@/components/workspaces/CreateWorkspaceModal";

function WorkspaceSwitcher() {
  const { mutateUser } = useAuth();
  const { workspaces, activeWorkspace } = useWorkspaces();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!activeWorkspace) {
    return null;
  }

  async function handleSelect(workspaceId: string) {
    if (workspaceId === activeWorkspace!.id) {
      return;
    }

    const response = await fetch(`/api/v1/workspaces/${workspaceId}/activate`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    // Revalidates every SWR key at once — the session carries
    // active_workspace_id, and any workspace-scoped page (documents,
    // analytics, the workspace list itself) needs to refresh with it.
    await mutateUser();
    await mutate(() => true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {activeWorkspace.is_personal ? "Pessoal" : activeWorkspace.name}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => handleSelect(workspace.id)}
            >
              {workspace.is_personal ? "Pessoal" : workspace.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Criar workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}

export function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Papershare
        </Link>

        <nav className="flex items-center gap-2">
          {isLoading ? null : user ? (
            <>
              <WorkspaceSwitcher />
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/settings">Configurações</Link>
              </Button>
              {user.is_superadmin && (
                <Button variant="ghost" asChild>
                  <Link href="/superadmin/migrations">Superadmin</Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Cadastrar</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
