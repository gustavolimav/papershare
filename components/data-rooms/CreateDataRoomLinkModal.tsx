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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { parseAllowedEmails } from "@/lib/parseAllowedEmails";
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
  const [requireEmail, setRequireEmail] = useState(false);
  const [allowedEmailsText, setAllowedEmailsText] = useState("");
  const [notifyOnView, setNotifyOnView] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [ndaText, setNdaText] = useState("");
  const [brandAccentColor, setBrandAccentColor] = useState("");
  const [brandWelcomeMessage, setBrandWelcomeMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setLabel("");
    setPassword("");
    setExpiresAt("");
    setRequireEmail(false);
    setAllowedEmailsText("");
    setNotifyOnView(true);
    setWatermarkEnabled(false);
    setNdaText("");
    setBrandAccentColor("");
    setBrandWelcomeMessage("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const allowedEmails = parseAllowedEmails(allowedEmailsText);

      const body: Record<string, unknown> = {
        require_email: requireEmail,
        notify_on_view: notifyOnView,
        watermark_enabled: watermarkEnabled,
        ...(allowedEmails.length > 0 && { allowed_emails: allowedEmails }),
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

      if (ndaText) {
        body.nda_text = ndaText;
      }

      if (brandAccentColor) {
        body.brand_accent_color = brandAccentColor;
      }

      if (brandWelcomeMessage) {
        body.brand_welcome_message = brandWelcomeMessage;
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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar link da data room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
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

            <div className="flex items-center gap-2">
              <Switch
                id="drRequireEmail"
                checked={requireEmail}
                onCheckedChange={setRequireEmail}
              />
              <Label htmlFor="drRequireEmail">Exigir email do visitante</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drAllowedEmails">
                Lista de emails permitidos (opcional)
              </Label>
              <Textarea
                id="drAllowedEmails"
                value={allowedEmailsText}
                onChange={(event) => setAllowedEmailsText(event.target.value)}
                placeholder="um@exemplo.com&#10;outro@exemplo.com"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Um email por linha. Se preenchido, só esses emails poderão
                acessar o link (mesmo com a senha correta).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="drNotifyOnView"
                checked={notifyOnView}
                onCheckedChange={setNotifyOnView}
              />
              <Label htmlFor="drNotifyOnView">
                Notificar por e-mail ao ser visualizado
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="drWatermarkEnabled"
                checked={watermarkEnabled}
                onCheckedChange={setWatermarkEnabled}
              />
              <Label htmlFor="drWatermarkEnabled">
                Marca d&apos;água com email do visitante
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drNdaText">
                Termo de confidencialidade (opcional)
              </Label>
              <Textarea
                id="drNdaText"
                value={ndaText}
                onChange={(event) => setNdaText(event.target.value)}
                placeholder="Cole aqui o texto que o visitante deve aceitar antes de ver os documentos"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Se preenchido, o visitante precisa informar nome e email e
                aceitar este termo antes de acessar a data room.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drBrandAccentColor">
                Cor de destaque (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="drBrandAccentColor"
                  type="color"
                  value={brandAccentColor || "#000000"}
                  onChange={(event) => setBrandAccentColor(event.target.value)}
                  className="h-9 w-14 p-1"
                />
                {brandAccentColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrandAccentColor("")}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drBrandWelcomeMessage">
                Mensagem de boas-vindas (opcional)
              </Label>
              <Textarea
                id="drBrandWelcomeMessage"
                value={brandWelcomeMessage}
                onChange={(event) => setBrandWelcomeMessage(event.target.value)}
                placeholder="Ex: Olá! Segue a documentação da rodada, qualquer dúvida me chama."
                rows={2}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

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
