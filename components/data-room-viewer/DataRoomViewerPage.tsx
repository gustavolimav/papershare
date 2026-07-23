"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileQuestion,
  Ban,
  Clock,
  AlertCircle,
  Download,
  Eye,
} from "lucide-react";
import { PasswordGate } from "@/components/viewer/PasswordGate";
import { ViewerCardShell } from "@/components/viewer/ViewerCardShell";
import { ViewerStateCard } from "@/components/viewer/ViewerStateCard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { DataRoomLinkWithDocuments } from "@/types/index";

interface DataRoomViewerPageProps {
  token: string;
}

type ErrorKind = "not-found" | "revoked" | "expired" | "generic";

type LoadState =
  | { status: "loading" }
  | { status: "password-required"; error?: string }
  | { status: "error"; kind: ErrorKind; message: string }
  | { status: "ready"; link: DataRoomLinkWithDocuments };

const ERROR_PRESENTATION: Record<
  ErrorKind,
  { icon: typeof FileQuestion; title: string }
> = {
  "not-found": { icon: FileQuestion, title: "Link não encontrado" },
  revoked: { icon: Ban, title: "Link revogado" },
  expired: { icon: Clock, title: "Link expirado" },
  generic: { icon: AlertCircle, title: "Não foi possível abrir a data room" },
};

function classifyError(message: string): ErrorKind {
  if (message.includes("revogado")) return "revoked";
  if (message.includes("expirou")) return "expired";
  if (message.includes("não foi encontrado")) return "not-found";
  return "generic";
}

async function fetchDocumentBlob(
  token: string,
  documentId: string,
  password?: string,
): Promise<Blob> {
  const response = await fetch(
    `/api/v1/data-room-share/${token}/file?document_id=${documentId}`,
    {
      headers: password ? { "X-Share-Password": password } : {},
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível carregar o arquivo.");
  }

  return response.blob();
}

export function DataRoomViewerPage({ token }: DataRoomViewerPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(
    null,
  );
  const passwordRef = useRef<string | undefined>(undefined);

  const load = useCallback(
    async (overrides?: { password?: string }) => {
      if (overrides?.password !== undefined) {
        passwordRef.current = overrides.password;
      }

      try {
        const response = await fetch(`/api/v1/data-room-share/${token}`, {
          headers: passwordRef.current
            ? { "X-Share-Password": passwordRef.current }
            : {},
        });

        const body = await response.json().catch(() => null);

        if (response.status === 403 && body?.message === "Senha incorreta.") {
          setState({
            status: "password-required",
            error: overrides ? body.message : undefined,
          });
          return;
        }

        if (!response.ok) {
          const message =
            body?.message ?? "Não foi possível abrir a data room.";
          setState({ status: "error", kind: classifyError(message), message });
          return;
        }

        setState({ status: "ready", link: body as DataRoomLinkWithDocuments });
      } catch {
        setState({
          status: "error",
          kind: "generic",
          message: "Não foi possível abrir a data room.",
        });
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handlePasswordSubmit(password: string) {
    setIsSubmittingPassword(true);
    try {
      await load({ password });
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  async function handleView(documentId: string) {
    setLoadingDocumentId(documentId);
    try {
      const blob = await fetchDocumentBlob(
        token,
        documentId,
        passwordRef.current,
      );
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } finally {
      setLoadingDocumentId(null);
    }
  }

  async function handleDownload(documentId: string, filename: string) {
    setLoadingDocumentId(documentId);
    try {
      const blob = await fetchDocumentBlob(
        token,
        documentId,
        passwordRef.current,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingDocumentId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <ViewerCardShell>
        <p className="text-center text-muted-foreground">Carregando...</p>
      </ViewerCardShell>
    );
  }

  if (state.status === "password-required") {
    return (
      <PasswordGate
        onSubmit={handlePasswordSubmit}
        error={state.error}
        isSubmitting={isSubmittingPassword}
      />
    );
  }

  if (state.status === "error") {
    const presentation = ERROR_PRESENTATION[state.kind];
    return (
      <ViewerCardShell>
        <ViewerStateCard
          icon={presentation.icon}
          title={presentation.title}
          description={state.message}
        />
      </ViewerCardShell>
    );
  }

  const { link } = state;

  return (
    <ViewerCardShell className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {link.data_room.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {link.documents.map((document) => (
            <div
              key={document.document_id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <span className="truncate text-sm font-medium">
                {document.title}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingDocumentId === document.document_id}
                  onClick={() => handleView(document.document_id)}
                >
                  <Eye className="h-3.5 w-3.5" /> Visualizar
                </Button>
                {document.allow_download && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loadingDocumentId === document.document_id}
                    onClick={() =>
                      handleDownload(document.document_id, document.title)
                    }
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ViewerCardShell>
  );
}
