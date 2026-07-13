"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PasswordGate } from "@/components/viewer/PasswordGate";
import { PDFViewer } from "@/components/viewer/PDFViewer";
import { getViewerFingerprint } from "@/lib/fingerprint";
import type { ShareLinkWithDocument } from "@/types/index";

interface ViewerPageProps {
  token: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "password-required"; error?: string }
  | { status: "error"; message: string }
  | { status: "ready"; link: ShareLinkWithDocument; fileData: ArrayBuffer };

export function ViewerPage({ token }: ViewerPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const fingerprintRef = useRef<string>("");
  const startTimeRef = useRef<number | null>(null);
  const pagesViewedRef = useRef(1);

  useEffect(() => {
    fingerprintRef.current = getViewerFingerprint();
  }, []);

  const load = useCallback(
    async (password?: string) => {
      const headers: HeadersInit = password
        ? { "X-Share-Password": password }
        : {};

      const linkResponse = await fetch(`/api/v1/share/${token}`, { headers });

      if (linkResponse.status === 404) {
        setState({ status: "error", message: "Este link não foi encontrado." });
        return;
      }

      if (linkResponse.status === 403) {
        const body = await linkResponse.json().catch(() => null);
        const message: string = body?.message ?? "";

        if (message.includes("Senha")) {
          setState({
            status: "password-required",
            ...(password ? { error: "Senha incorreta." } : {}),
          });
          return;
        }

        setState({
          status: "error",
          message: message || "Este link não está mais disponível.",
        });
        return;
      }

      if (!linkResponse.ok) {
        setState({
          status: "error",
          message: "Não foi possível carregar o documento.",
        });
        return;
      }

      const link: ShareLinkWithDocument = await linkResponse.json();

      if (link.document.mime_type !== "application/pdf") {
        setState({ status: "ready", link, fileData: new ArrayBuffer(0) });
        return;
      }

      const fileResponse = await fetch(`/api/v1/share/${token}/file`, {
        headers,
      });

      if (!fileResponse.ok) {
        setState({
          status: "error",
          message: "Não foi possível carregar o arquivo.",
        });
        return;
      }

      const fileData = await fileResponse.arrayBuffer();
      setState({ status: "ready", link, fileData });
      startTimeRef.current = Date.now();

      fetch(`/api/v1/share/${token}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewer_fingerprint: fingerprintRef.current }),
      }).catch(() => undefined);
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function recordExit() {
      if (startTimeRef.current === null) {
        return;
      }

      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);

      navigator.sendBeacon(
        `/api/v1/share/${token}/view`,
        new Blob(
          [
            JSON.stringify({
              viewer_fingerprint: fingerprintRef.current,
              time_on_page: timeOnPage,
              pages_viewed: pagesViewedRef.current,
            }),
          ],
          { type: "application/json" },
        ),
      );
    }

    window.addEventListener("beforeunload", recordExit);
    return () => window.removeEventListener("beforeunload", recordExit);
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (state.status === "password-required") {
    return (
      <PasswordGate
        error={state.error}
        isSubmitting={isSubmittingPassword}
        onSubmit={async (password) => {
          setIsSubmittingPassword(true);
          await load(password);
          setIsSubmittingPassword(false);
        }}
      />
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-muted-foreground">
        {state.message}
      </div>
    );
  }

  const { link, fileData } = state;

  if (link.document.mime_type !== "application/pdf") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">
          Pré-visualização não disponível para este tipo de arquivo.
        </p>
        {link.allow_download && (
          <a
            href={`/api/v1/share/${token}/file`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Baixar arquivo
          </a>
        )}
      </div>
    );
  }

  return (
    <PDFViewer
      fileData={fileData}
      allowDownload={link.allow_download}
      downloadUrl={`/api/v1/share/${token}/file`}
      onPageChange={(page) => {
        pagesViewedRef.current = Math.max(pagesViewedRef.current, page);
      }}
    />
  );
}
