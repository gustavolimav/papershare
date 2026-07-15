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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { ShareLinkResponse } from "@/types/index";

interface CreateShareLinkModalProps {
  documentId: string;
  onCreated: (link: ShareLinkResponse) => void;
}

export function CreateShareLinkModal({
  documentId,
  onCreated,
}: CreateShareLinkModalProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [notifyOnView, setNotifyOnView] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setLabel("");
    setPassword("");
    setExpiresAt("");
    setAllowDownload(true);
    setNotifyOnView(true);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        allow_download: allowDownload,
        notify_on_view: notifyOnView,
      };

      if (label) {
        body.label = label;
      }

      if (password) {
        body.password = password;
      }

      if (expiresAt) {
        body.expires_at = new Date(expiresAt).toISOString();
      }

      const response = await fetch(`/api/v1/documents/${documentId}/links`, {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Criar novo link</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar link de compartilhamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Rótulo (opcional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (opcional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiração (opcional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allowDownload"
              checked={allowDownload}
              onCheckedChange={(checked) => setAllowDownload(checked === true)}
            />
            <Label htmlFor="allowDownload">Permitir download</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="notifyOnView"
              checked={notifyOnView}
              onCheckedChange={setNotifyOnView}
            />
            <Label htmlFor="notifyOnView">
              Notificar por e-mail ao ser visualizado
            </Label>
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
