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
import { Textarea } from "@/components/ui/textarea";
import { parseAllowedEmails } from "@/lib/parseAllowedEmails";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { toastPaymentRequired } from "@/lib/toastPaymentRequired";
import { ProFeatureHint } from "@/components/share-links/ProFeatureHint";
import type { ShareLinkResponse } from "@/types/index";

interface CreateShareLinkModalProps {
  documentId: string;
  onCreated: (link: ShareLinkResponse) => void;
  // When set, the form is seeded from an existing link's settings instead
  // of blank defaults (the "Duplicate settings" flow) — everything except
  // the password, which can't be carried over since only its hash is ever
  // available. When open/onOpenChange are provided, the dialog's visibility
  // is externally controlled and the default trigger button is hidden —
  // used by ShareLinkList, which drives this from a link's own "Duplicar"
  // button instead.
  prefill?: ShareLinkResponse | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export function CreateShareLinkModal({
  documentId,
  onCreated,
  prefill,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CreateShareLinkModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;
  const { activeWorkspace } = useWorkspaces();
  const isFree = activeWorkspace?.plan === "free";

  const [label, setLabel] = useState(
    prefill?.label ? `${prefill.label} (cópia)` : "",
  );
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState(
    prefill?.expires_at
      ? new Date(prefill.expires_at).toISOString().slice(0, 10)
      : "",
  );
  const [allowDownload, setAllowDownload] = useState(
    prefill?.allow_download ?? true,
  );
  const [notifyOnView, setNotifyOnView] = useState(
    prefill?.notify_on_view ?? true,
  );
  const [requireEmail, setRequireEmail] = useState(
    prefill?.require_email ?? false,
  );
  const [allowedEmailsText, setAllowedEmailsText] = useState(
    prefill?.allowed_emails.join("\n") ?? "",
  );
  const [watermarkEnabled, setWatermarkEnabled] = useState(
    prefill?.watermark_enabled ?? false,
  );
  const [ndaText, setNdaText] = useState(prefill?.nda_text ?? "");
  const [brandAccentColor, setBrandAccentColor] = useState(
    prefill?.brand_accent_color ?? "",
  );
  const [brandWelcomeMessage, setBrandWelcomeMessage] = useState(
    prefill?.brand_welcome_message ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Only disabled when currently off/empty — duplicating a link that already
  // had one of these set (from before a downgrade) still lets the user turn
  // it off/clear it before creating the copy, matching the backend's
  // "removal is never gated" rule.
  const watermarkDisabled = isFree && !watermarkEnabled;
  const allowedEmailsDisabled = isFree && allowedEmailsText.trim() === "";
  const ndaDisabled = isFree && ndaText.trim() === "";
  const brandAccentDisabled = isFree && !brandAccentColor;
  const brandWelcomeDisabled = isFree && brandWelcomeMessage.trim() === "";

  function reset() {
    setLabel("");
    setPassword("");
    setExpiresAt("");
    setAllowDownload(true);
    setNotifyOnView(true);
    setRequireEmail(false);
    setAllowedEmailsText("");
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
        allow_download: allowDownload,
        notify_on_view: notifyOnView,
        require_email: requireEmail,
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

      const response = await fetch(`/api/v1/documents/${documentId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);

        if (!toastPaymentRequired(response.status, responseBody)) {
          setError(responseBody?.message ?? "Não foi possível criar o link.");
        }

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
      {!isControlled && (
        <DialogTrigger asChild>
          <Button type="button">Criar novo link</Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {prefill
              ? "Duplicar link de compartilhamento"
              : "Criar link de compartilhamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
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
                placeholder={
                  prefill?.has_password
                    ? "O link original tinha senha — defina uma nova"
                    : undefined
                }
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
                onCheckedChange={(checked) =>
                  setAllowDownload(checked === true)
                }
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

            <div className="flex items-center gap-2">
              <Switch
                id="requireEmail"
                checked={requireEmail}
                onCheckedChange={setRequireEmail}
              />
              <Label htmlFor="requireEmail">Exigir email do visitante</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowedEmails">
                Lista de emails permitidos (opcional)
              </Label>
              <Textarea
                id="allowedEmails"
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
                  acessar o link (mesmo com a senha correta).
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="watermarkEnabled"
                checked={watermarkEnabled}
                onCheckedChange={setWatermarkEnabled}
                disabled={watermarkDisabled}
              />
              <Label htmlFor="watermarkEnabled">
                Marca d&apos;água com email do visitante
              </Label>
            </div>
            {watermarkDisabled && <ProFeatureHint />}

            <div className="space-y-2">
              <Label htmlFor="ndaText">
                Termo de confidencialidade (opcional)
              </Label>
              <Textarea
                id="ndaText"
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
                  aceitar este termo antes de acessar o documento.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandAccentColor">
                Cor de destaque (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="brandAccentColor"
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
              <Label htmlFor="brandWelcomeMessage">
                Mensagem de boas-vindas (opcional)
              </Label>
              <Textarea
                id="brandWelcomeMessage"
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
              {isSubmitting ? "Criando..." : "Criar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
