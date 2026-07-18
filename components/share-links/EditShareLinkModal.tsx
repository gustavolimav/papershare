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
import { useWorkspaces } from "@/lib/useWorkspaces";
import { toastPaymentRequired } from "@/lib/toastPaymentRequired";
import { ProFeatureHint } from "@/components/share-links/ProFeatureHint";
import type { ShareLinkResponse, ShareLinkUpdateInput } from "@/types/index";

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

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
  const [watermarkEnabled, setWatermarkEnabled] = useState(
    link.watermark_enabled,
  );
  const [ndaText, setNdaText] = useState(link.nda_text ?? "");
  const [brandAccentColor, setBrandAccentColor] = useState(
    link.brand_accent_color ?? "",
  );
  const [brandWelcomeMessage, setBrandWelcomeMessage] = useState(
    link.brand_welcome_message ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeWorkspace } = useWorkspaces();
  const isFree = activeWorkspace?.plan === "free";
  // Only disabled when currently off/empty — a link that already has one of
  // these set (from before a downgrade) can still be turned off or cleared,
  // matching the backend's "removal is never gated" rule.
  const watermarkDisabled = isFree && !watermarkEnabled;
  const allowedEmailsDisabled = isFree && allowedEmailsText.trim() === "";
  const ndaDisabled = isFree && ndaText.trim() === "";
  const brandAccentDisabled = isFree && !brandAccentColor;
  const brandWelcomeDisabled = isFree && brandWelcomeMessage.trim() === "";

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
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      // On Free, only send the gated fields when they actually changed —
      // otherwise re-submitting a link that already had one set (from
      // before a downgrade) would resend its existing value and get
      // rejected as a new attempt to enable a Pro-only feature, blocking
      // edits that have nothing to do with the gated field itself.
      const newAllowedEmails = parseAllowedEmails(allowedEmailsText);
      const newNdaText = ndaText || null;
      const newBrandAccentColor = brandAccentColor || null;
      const newBrandWelcomeMessage = brandWelcomeMessage || null;

      if (!isFree || watermarkEnabled !== link.watermark_enabled) {
        body.watermark_enabled = watermarkEnabled;
      }

      if (!isFree || !arraysEqual(newAllowedEmails, link.allowed_emails)) {
        body.allowed_emails = newAllowedEmails;
      }

      if (!isFree || newNdaText !== (link.nda_text ?? null)) {
        body.nda_text = newNdaText;
      }

      if (
        !isFree ||
        newBrandAccentColor !== (link.brand_accent_color ?? null)
      ) {
        body.brand_accent_color = newBrandAccentColor;
      }

      if (
        !isFree ||
        newBrandWelcomeMessage !== (link.brand_welcome_message ?? null)
      ) {
        body.brand_welcome_message = newBrandWelcomeMessage;
      }

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

        if (!toastPaymentRequired(response.status, responseBody)) {
          setError(
            responseBody?.message ?? "Não foi possível salvar as alterações.",
          );
        }

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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar link de compartilhamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
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
                onCheckedChange={(checked) =>
                  setAllowDownload(checked === true)
                }
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
              <Label htmlFor="edit-requireEmail">
                Exigir email do visitante
              </Label>
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
                disabled={allowedEmailsDisabled}
              />
              {allowedEmailsDisabled ? (
                <ProFeatureHint />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Um email por linha. Se preenchido, só esses emails poderão
                  acessar o link (mesmo com a senha correta). Deixe em branco
                  para não restringir.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit-watermarkEnabled"
                checked={watermarkEnabled}
                onCheckedChange={setWatermarkEnabled}
                disabled={watermarkDisabled}
              />
              <Label htmlFor="edit-watermarkEnabled">
                Marca d&apos;água com email do visitante
              </Label>
            </div>
            {watermarkDisabled && <ProFeatureHint />}

            <div className="space-y-2">
              <Label htmlFor="edit-ndaText">Termo de confidencialidade</Label>
              <Textarea
                id="edit-ndaText"
                value={ndaText}
                onChange={(event) => setNdaText(event.target.value)}
                placeholder="Cole aqui o texto que o visitante deve aceitar antes de ver o documento"
                rows={4}
                disabled={ndaDisabled}
              />
              {ndaDisabled ? (
                <ProFeatureHint />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se preenchido, o visitante precisa informar nome e email e
                  aceitar este termo antes de acessar o documento. Deixe em
                  branco para remover a exigência.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-brandAccentColor">Cor de destaque</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-brandAccentColor"
                  type="color"
                  value={brandAccentColor || "#000000"}
                  onChange={(event) => setBrandAccentColor(event.target.value)}
                  className="h-9 w-14 p-1"
                  disabled={brandAccentDisabled}
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
              {brandAccentDisabled ? (
                <ProFeatureHint />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Usada nos botões e destaques da página de visualização, no
                  lugar da cor padrão do Papershare — útil para combinar com a
                  marca de quem está enviando. Só aparece depois que o visitante
                  desbloqueia o documento, não nas telas de senha, email ou
                  termo de aceite.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-brandWelcomeMessage">
                Mensagem de boas-vindas
              </Label>
              <Textarea
                id="edit-brandWelcomeMessage"
                value={brandWelcomeMessage}
                onChange={(event) => setBrandWelcomeMessage(event.target.value)}
                placeholder="Ex: Olá! Segue o contrato revisado, qualquer dúvida me chama."
                rows={2}
                disabled={brandWelcomeDisabled}
              />
              {brandWelcomeDisabled && <ProFeatureHint />}
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

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
