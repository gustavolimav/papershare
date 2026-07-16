"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ViewerControls } from "@/components/viewer/ViewerControls";

const PDFJS_VERSION = "5.4.296";
const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

interface PDFViewerProps {
  fileData: ArrayBuffer;
  allowDownload: boolean;
  onDownload: () => void;
  onPageChange?: (page: number) => void;
  watermarkText?: string | undefined;
}

// Tiles the given text diagonally across the canvas, drawn directly into
// the rendered bitmap (not a DOM overlay) so it survives a screenshot or a
// browser print of the page. This deters casual leaking — it isn't
// tamper-proof against someone editing the client, and the downloadable
// file itself is untouched (that would need rewriting the PDF bytes, out
// of scope here).
function drawWatermark(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
) {
  context.save();
  context.globalAlpha = 0.15;
  context.fillStyle = "#000000";
  context.font = "16px sans-serif";
  context.textAlign = "center";
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(-Math.PI / 6);

  const stepX = context.measureText(text).width + 60;
  const stepY = 90;
  const diagonal = Math.hypot(canvas.width, canvas.height);

  for (let y = -diagonal; y < diagonal; y += stepY) {
    for (let x = -diagonal; x < diagonal; x += stepX) {
      context.fillText(text, x, y);
    }
  }

  context.restore();
}

export function PDFViewer({
  fileData,
  allowDownload,
  onDownload,
  onPageChange,
  watermarkText,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // pdfjs-dist ships a pre-bundled .mjs; webpack re-bundling it (via a
      // normal import) corrupts its internal module wiring and throws
      // "Object.defineProperty called on non-object". Loading it as a real
      // native ES module from the CDN, same as the worker, sidesteps that.
      const pdfjsLib = await import(
        /* webpackIgnore: true */ `${PDFJS_CDN_BASE}/pdf.min.mjs`
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.mjs`;

      try {
        const loadingTask = pdfjsLib.getDocument({ data: fileData.slice(0) });
        const doc = await loadingTask.promise;

        if (cancelled) {
          return;
        }

        docRef.current = doc;
        setTotalPages(doc.numPages);
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar o documento.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [fileData]);

  useEffect(() => {
    if (totalPages === 0) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      const doc = docRef.current;
      const canvas = canvasRef.current;

      if (!doc || !canvas) {
        return;
      }

      const page = await doc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");

      if (!context || cancelled) {
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      if (watermarkText) {
        drawWatermark(context, canvas, watermarkText);
      }
    }

    renderPage();
    onPageChange?.(currentPage);

    return () => {
      cancelled = true;
    };
  }, [currentPage, scale, totalPages, onPageChange, watermarkText]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <ViewerControls
        currentPage={currentPage}
        totalPages={totalPages || 1}
        scale={scale}
        onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() =>
          setCurrentPage((page) => Math.min(totalPages, page + 1))
        }
        onZoomIn={() => setScale((value) => Math.min(3, value + 0.2))}
        onZoomOut={() => setScale((value) => Math.max(0.4, value - 0.2))}
        allowDownload={allowDownload}
        onDownload={onDownload}
      />
      <div
        className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-4"
        style={
          allowDownload
            ? undefined
            : { pointerEvents: "none", userSelect: "none" }
        }
      >
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
