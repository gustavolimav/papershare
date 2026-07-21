"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceModal } from "@/components/workspaces/CreateWorkspaceModal";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

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
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between gap-1"
          >
            <span className="truncate">
              {activeWorkspace.is_personal ? "Pessoal" : activeWorkspace.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width)"
        >
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

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspaces();

  const initial = user?.username?.[0]?.toUpperCase() ?? "?";
  const planLabel = activeWorkspace
    ? (PLAN_LABELS[activeWorkspace.plan] ?? activeWorkspace.plan)
    : null;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-5">
          <Link
            href="/dashboard"
            className="font-heading text-lg font-semibold tracking-tight"
          >
            Papershare
          </Link>
        </div>

        <div className="px-3 pb-3">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <NavLink href="/dashboard" icon={FileText}>
            Documentos
          </NavLink>
          <NavLink href="/settings" icon={Settings}>
            Configurações
          </NavLink>
          {user?.is_superadmin && (
            <NavLink href="/superadmin/migrations" icon={ShieldCheck}>
              Superadmin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            {planLabel && (
              <p className="truncate text-xs text-sidebar-foreground/60">
                Plano: {planLabel}
              </p>
            )}
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
