"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DataRoomLinkResponse } from "@/types/index";

interface CreateDataRoomLinkModalProps {
  dataRoomId: string;
  onCreated: (link: DataRoomLinkResponse) => void;
}

export function CreateDataRoomLinkModal({
  dataRoomId,
  onCreated,
}: CreateDataRoomLinkModalProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setLabel("");
    setPassword("");
    setExpiresAt("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {};

      if (label) {
        body.label = label;
      }

      if (password) {
        body.password = password;
      }

      if (expiresAt) {
        body.expires_at = new Date(expiresAt).toISOString();
      }

      const response = await fetch(`/api/v1/data-rooms/${dataRoomId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setError(responseBody?.message ?? "Não foi possível criar o link.");
        return;
      }

      const created = await response.json();
      onCreated(created);
      reset();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Criar link</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar link da data room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataRoomLinkLabel">Rótulo (opcional)</Label>
            <Input
              id="dataRoomLinkLabel"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataRoomLinkPassword">Senha (opcional)</Label>
            <Input
              id="dataRoomLinkPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="drLinkExpiresAt">Expiração (opcional)</Label>
            <Input
              id="drLinkExpiresAt"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
