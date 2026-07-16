"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PasswordGate } from "@/components/viewer/PasswordGate";
import { EmailGate } from "@/components/viewer/EmailGate";
import { PDFViewer } from "@/components/viewer/PDFViewer";
import { getViewerFingerprint } from "@/lib/fingerprint";
import type { ShareLinkWithDocument } from "@/types/index";

interface ViewerPageProps {
  token: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "password-required"; error?: string }
  | { status: "email-required"; error?: string }
  | { status: "error"; message: string }
  | { status: "ready"; link: ShareLinkWithDocument; fileData: ArrayBuffer };

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
};

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ViewerPage({ token }: ViewerPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const fingerprintRef = useRef<string>("");
  const startTimeRef = useRef<number | null>(null);
  const pagesViewedRef = useRef(1);
  const passwordRef = useRef<string | undefined>(undefined);
  const emailRef = useRef<string | undefined>(undefined);
  // Accumulated dwell time per page number, in seconds.
  const pageTimesRef = useRef<Map<number, number>>(new Map());
  const currentPageTrackRef = useRef<{
    page: number;
    startedAt: number;
  } | null>(null);

  // Closes out the dwell time for whichever page was being tracked, then
  // (if given a new page) starts tracking it. Called both on navigation
  // and, with no argument, right before the final beacon on unload.
  const trackPageChange = useCallback((nextPage?: number) => {
    const current = currentPageTrackRef.current;

    if (current) {
      const elapsed = Math.round((Date.now() - current.startedAt) / 1000);
      pageTimesRef.current.set(
        current.page,
        (pageTimesRef.current.get(current.page) ?? 0) + elapsed,
      );
    }

    currentPageTrackRef.current =
      nextPage !== undefined ? { page: nextPage, startedAt: Date.now() } : null;
  }, []);

  useEffect(() => {
    fingerprintRef.current = getViewerFingerprint();
  }, []);

  const load = useCallback(
    async (overrides?: { password?: string; email?: string }) => {
      if (overrides?.password !== undefined) {
        passwordRef.current = overrides.password;
      }
      if (overrides?.email !== undefined) {
        emailRef.current = overrides.email;
      }

      const headers: HeadersInit = {
        ...(passwordRef.current
          ? { "X-Share-Password": passwordRef.current }
          : {}),
        ...(emailRef.current ? { "X-Viewer-Email": emailRef.current } : {}),
      };

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
            ...(overrides?.password !== undefined
              ? { error: "Senha incorreta." }
              : {}),
          });
          return;
        }

        if (message.includes("Email")) {
          setState({
            status: "email-required",
            ...(overrides?.email !== undefined ? { error: message } : {}),
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
        body: JSON.stringify({
          viewer_fingerprint: fingerprintRef.current,
          ...(emailRef.current ? { viewer_email: emailRef.current } : {}),
        }),
      }).catch(() => undefined);
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Navigating (or opening in a new tab) straight to the file URL can't
  // attach the X-Share-Password header, so a password-protected link would
  // always 403 here even with the correct password already unlocked above.
  // Reuse the already-fetched bytes for PDFs; fetch with the header for
  // other file types, then hand the browser a blob URL to download instead.
  const handleDownload = useCallback(async () => {
    if (state.status !== "ready") {
      return;
    }

    const { link, fileData } = state;
    const filename = `${link.document.title}${EXTENSION_BY_MIME_TYPE[link.document.mime_type] ?? ""}`;

    if (
      link.document.mime_type === "application/pdf" &&
      fileData.byteLength > 0
    ) {
      triggerBlobDownload(
        new Blob([fileData], { type: link.document.mime_type }),
        filename,
      );
      return;
    }

    const headers: HeadersInit = {
      ...(passwordRef.current
        ? { "X-Share-Password": passwordRef.current }
        : {}),
      ...(emailRef.current ? { "X-Viewer-Email": emailRef.current } : {}),
    };

    const response = await fetch(`/api/v1/share/${token}/file`, { headers });

    if (!response.ok) {
      return;
    }

    triggerBlobDownload(await response.blob(), filename);
  }, [state, token]);

  useEffect(() => {
    function recordExit() {
      if (startTimeRef.current === null) {
        return;
      }

      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);

      trackPageChange();
      const pageTimes = Array.from(pageTimesRef.current.entries()).map(
        ([page, seconds]) => ({ page, seconds }),
      );

      navigator.sendBeacon(
        `/api/v1/share/${token}/view`,
        new Blob(
          [
            JSON.stringify({
              viewer_fingerprint: fingerprintRef.current,
              ...(emailRef.current && { viewer_email: emailRef.current }),
              time_on_page: timeOnPage,
              pages_viewed: pagesViewedRef.current,
              ...(pageTimes.length > 0 && { page_times: pageTimes }),
            }),
          ],
          { type: "application/json" },
        ),
      );
    }

    window.addEventListener("beforeunload", recordExit);
    return () => window.removeEventListener("beforeunload", recordExit);
  }, [token, trackPageChange]);

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
          await load({ password });
          setIsSubmittingPassword(false);
        }}
      />
    );
  }

  if (state.status === "email-required") {
    return (
      <EmailGate
        error={state.error}
        isSubmitting={isSubmittingEmail}
        onSubmit={async (email) => {
          setIsSubmittingEmail(true);
          await load({ email });
          setIsSubmittingEmail(false);
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
          <button
            type="button"
            onClick={handleDownload}
            className="text-primary underline-offset-4 hover:underline"
          >
            Baixar arquivo
          </button>
        )}
      </div>
    );
  }

  return (
    <PDFViewer
      fileData={fileData}
      allowDownload={link.allow_download}
      onDownload={handleDownload}
      onPageChange={(page) => {
        pagesViewedRef.current = Math.max(pagesViewedRef.current, page);
        trackPageChange(page);
      }}
    />
  );
}
