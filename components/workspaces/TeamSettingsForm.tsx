"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaces, WORKSPACES_KEY } from "@/lib/useWorkspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateWorkspaceModal } from "@/components/workspaces/CreateWorkspaceModal";
import type { WorkspaceMemberResponse, WorkspaceRole } from "@/types/index";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export function TeamSettingsForm() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspaces();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!activeWorkspace) {
    return null;
  }

  if (activeWorkspace.is_personal) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Este é o seu workspace pessoal — só você tem acesso a ele. Crie um
          workspace de equipe para convidar outras pessoas e compartilhar
          documentos com elas.
        </p>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          Criar workspace
        </Button>
        <CreateWorkspaceModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </div>
    );
  }

  return (
    <MemberList workspaceId={activeWorkspace.id} currentUserId={user!.id} />
  );
}

interface MemberListProps {
  workspaceId: string;
  currentUserId: string;
}

function MemberList({ workspaceId, currentUserId }: MemberListProps) {
  const membersKey = `/api/v1/workspaces/${workspaceId}/members`;
  const { data: members, mutate: mutateMembers } = useSWR<
    WorkspaceMemberResponse[]
  >(membersKey, fetcher);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  if (!members) {
    return null;
  }

  const currentMember = members.find(
    (member) => member.user_id === currentUserId,
  );
  const isOwner = currentMember?.role === "owner";
  const ownerCount = members.filter((member) => member.role === "owner").length;

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setInviteError(null);
    setIsInviting(true);

    try {
      const response = await fetch(membersKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setInviteError(body?.message ?? "Não foi possível convidar o membro.");
        return;
      }

      setInviteEmail("");
      await mutateMembers();
      toast.success("Membro convidado com sucesso.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(targetUserId: string, role: WorkspaceRole) {
    setPendingUserId(targetUserId);

    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/members/${targetUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );

      if (!response.ok) {
        toast.error("Não foi possível alterar o papel deste membro.");
        return;
      }

      await mutateMembers();
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleRemove(targetUserId: string) {
    setPendingUserId(targetUserId);

    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/members/${targetUserId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        toast.error("Não foi possível remover este membro.");
        return;
      }

      await mutateMembers();

      if (targetUserId === currentUserId) {
        // Left the workspace — the personal workspace is always a safe
        // fallback to switch back to.
        await mutate(WORKSPACES_KEY);
        toast.success("Você saiu do workspace.");
      } else {
        toast.success("Membro removido.");
      }
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {members.map((member) => {
          const isLastOwner = member.role === "owner" && ownerCount === 1;
          const isSelf = member.user_id === currentUserId;

          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.username}
                  {isSelf && " (você)"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={member.role}
                    disabled={isLastOwner || pendingUserId === member.user_id}
                    onChange={(event) =>
                      handleRoleChange(
                        member.user_id,
                        event.target.value as WorkspaceRole,
                      )
                    }
                  >
                    <option value="owner">Owner</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {ROLE_LABELS[member.role]}
                  </span>
                )}

                {isOwner && !isSelf && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLastOwner || pendingUserId === member.user_id}
                    onClick={() => handleRemove(member.user_id)}
                  >
                    Remover
                  </Button>
                )}

                {isSelf && !isLastOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingUserId === member.user_id}
                    onClick={() => handleRemove(member.user_id)}
                  >
                    Sair do workspace
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isOwner && (
        <form onSubmit={handleInvite} className="space-y-2">
          <Label htmlFor="invite-email">Convidar por email</Label>
          <div className="flex items-center gap-2">
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="pessoa@empresa.com"
              required
              className="flex-1"
            />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "editor" | "viewer")
              }
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? "Convidando..." : "Convidar"}
            </Button>
          </div>
          {inviteError && (
            <p role="alert" className="text-sm text-destructive">
              {inviteError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
