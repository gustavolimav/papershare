"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { parseAllowedEmails } from "@/lib/parseAllowedEmails";
import type { ShareLinkResponse, ShareLinkUpdateInput } from "@/types/index";

interface EditShareLinkModalProps {
  link: ShareLinkResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (link: ShareLinkResponse) => void;
}

export function EditShareLinkModal({
  link,
  open,
  onOpenChange,
  onSaved,
}: EditShareLinkModalProps) {
  const [label, setLabel] = useState(link.label ?? "");
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState(
    link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 10) : "",
  );
  const [allowDownload, setAllowDownload] = useState(link.allow_download);
  const [isActive, setIsActive] = useState(link.is_active);
  const [notifyOnView, setNotifyOnView] = useState(link.notify_on_view);
  const [requireEmail, setRequireEmail] = useState(link.require_email);
  const [allowedEmailsText, setAllowedEmailsText] = useState(
    link.allowed_emails.join("\n"),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const body: ShareLinkUpdateInput = {
        label: label || null,
        allow_download: allowDownload,
        is_active: isActive,
        notify_on_view: notifyOnView,
        require_email: requireEmail,
        allowed_emails: parseAllowedEmails(allowedEmailsText),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (clearPassword) {
        body.password = null;
      } else if (password) {
        body.password = password;
      }

      const response = await fetch(
        `/api/v1/documents/${link.document_id}/links/${link.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setError(
          responseBody?.message ?? "Não foi possível salvar as alterações.",
        );
        return;
      }

      const updated = await response.json();
      onSaved(updated);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar link de compartilhamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-label">Rótulo</Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Nova senha</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={clearPassword}
              placeholder={
                link.has_password
                  ? "Deixe em branco para manter a atual"
                  : "Sem senha"
              }
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="clear-password"
                checked={clearPassword}
                onCheckedChange={(checked) =>
                  setClearPassword(checked === true)
                }
              />
              <Label htmlFor="clear-password">Remover senha</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-expiresAt">Expiração</Label>
            <Input
              id="edit-expiresAt"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-allowDownload"
              checked={allowDownload}
              onCheckedChange={(checked) => setAllowDownload(checked === true)}
            />
            <Label htmlFor="edit-allowDownload">Permitir download</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="edit-isActive">Link ativo</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-notifyOnView"
              checked={notifyOnView}
              onCheckedChange={setNotifyOnView}
            />
            <Label htmlFor="edit-notifyOnView">
              Notificar por e-mail ao ser visualizado
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-requireEmail"
              checked={requireEmail}
              onCheckedChange={setRequireEmail}
            />
            <Label htmlFor="edit-requireEmail">Exigir email do visitante</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-allowedEmails">
              Lista de emails permitidos
            </Label>
            <Textarea
              id="edit-allowedEmails"
              value={allowedEmailsText}
              onChange={(event) => setAllowedEmailsText(event.target.value)}
              placeholder="um@exemplo.com&#10;outro@exemplo.com"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Um email por linha. Se preenchido, só esses emails poderão acessar
              o link (mesmo com a senha correta). Deixe em branco para não
              restringir.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
