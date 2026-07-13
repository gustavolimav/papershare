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
    <div className="flex flex-wrap items-center justify-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-1">
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
        <span className="text-sm tabular-nums">
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

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm tabular-nums">{Math.round(scale * 100)}%</span>
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
        <Button type="button" variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-1 h-4 w-4" /> Download
        </Button>
      )}
    </div>
  );
}
