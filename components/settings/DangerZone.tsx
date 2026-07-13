"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserPublic } from "@/types/index";

interface DangerZoneProps {
  user: UserPublic;
}

export function DangerZone({ user }: DangerZoneProps) {
  const router = useRouter();
  const { mutateUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/v1/sessions", { method: "DELETE" });
      await mutateUser();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);

    try {
      await fetch(`/api/v1/users/${user.username}`, { method: "DELETE" });
      router.push("/");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Conta</h2>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>

      <div className="rounded-lg border border-destructive/30 p-4">
        <h3 className="mb-1 font-medium text-destructive">Zona de perigo</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Excluir sua conta é permanente e não pode ser desfeito.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsDeleteOpen(true)}
        >
          Excluir conta
        </Button>
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
