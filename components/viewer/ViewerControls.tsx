"use client";

import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewerControlsProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  allowDownload: boolean;
  onDownload: () => void;
}

export function ViewerControls({
  currentPage,
  totalPages,
  scale,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  allowDownload,
  onDownload,
}: ViewerControlsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-14 text-center text-sm tabular-nums text-foreground">
          {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-sm tabular-nums text-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {allowDownload && (
        <Button type="button" variant="default" size="sm" onClick={onDownload}>
          <Download className="mr-1 h-4 w-4" /> Download
        </Button>
      )}
    </div>
  );
}
