"use client";

import { useState } from "react";
import { Copy, Check, Pencil, Ban, CopyPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditShareLinkModal } from "@/components/share-links/EditShareLinkModal";
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
import { formatDate } from "@/lib/formatters";
import type { ShareLinkResponse } from "@/types/index";

interface ShareLinkCardProps {
  link: ShareLinkResponse;
  canEdit: boolean;
  onUpdated: (link: ShareLinkResponse) => void;
  onRevoked: (link: ShareLinkResponse) => void;
  onDuplicate: (link: ShareLinkResponse) => void;
}

export function ShareLinkCard({
  link,
  canEdit,
  onUpdated,
  onRevoked,
  onDuplicate,
}: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/view/${link.token}`
      : `/view/${link.token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    setIsRevoking(true);

    try {
      const response = await fetch(
        `/api/v1/documents/${link.document_id}/links/${link.id}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        const updated = await response.json();
        onRevoked(updated);
      }
    } finally {
      setIsRevoking(false);
      setIsRevokeOpen(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{link.label ?? "Sem rótulo"}</span>
          <div className="flex gap-1">
            {!link.is_active && <Badge variant="destructive">Revogado</Badge>}
            {link.is_active && <Badge variant="secondary">Ativo</Badge>}
            {link.has_password && <Badge variant="outline">Com senha</Badge>}
            {link.require_email && (
              <Badge variant="outline">Requer email</Badge>
            )}
            {link.allowed_emails.length > 0 && (
              <Badge variant="outline">
                Lista de emails ({link.allowed_emails.length})
              </Badge>
            )}
            {link.watermark_enabled && (
              <Badge variant="outline">Marca d&apos;água</Badge>
            )}
            {link.nda_text && <Badge variant="outline">Termo de NDA</Badge>}
            {(link.brand_accent_color || link.brand_welcome_message) && (
              <Badge variant="outline">Personalizado</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="flex-1 truncate">{publicUrl}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            aria-label="Copiar link"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {link.expires_at
            ? `Expira em ${formatDate(link.expires_at)}`
            : "Sem expiração"}
          {" · "}
          {link.allow_download ? "Download permitido" : "Download bloqueado"}
        </p>

        {canEdit && (
          <div className="flex gap-2 pt-1">
            {link.is_active && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRevokeOpen(true)}
                >
                  <Ban className="mr-1 h-3 w-3" /> Revogar
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDuplicate(link)}
            >
              <CopyPlus className="mr-1 h-3 w-3" /> Duplicar
            </Button>
          </div>
        )}
      </CardContent>

      <EditShareLinkModal
        link={link}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={(updated) => {
          onUpdated(updated);
          setIsEditOpen(false);
        }}
      />

      <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar link</AlertDialogTitle>
            <AlertDialogDescription>
              Este link deixará de funcionar imediatamente. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={isRevoking}>
              {isRevoking ? "Revogando..." : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
