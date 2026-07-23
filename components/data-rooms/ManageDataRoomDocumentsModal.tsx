"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fetcher } from "@/lib/fetcher";
import type {
  DataRoomDocumentSummary,
  DocumentListResponse,
} from "@/types/index";

interface ManageDataRoomDocumentsModalProps {
  currentDocuments: DataRoomDocumentSummary[];
  onSave: (
    documents: { document_id: string; allow_download: boolean }[],
  ) => Promise<void>;
}

// Reuses each document's existing allow_download when it stays selected;
// newly checked documents default to allow_download: true, same default
// as creating a room for the first time.
export function ManageDataRoomDocumentsModal({
  currentDocuments,
  onSave,
}: ManageDataRoomDocumentsModalProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useSWR<DocumentListResponse>(
    open ? "/api/v1/documents?page=1&per_page=100" : null,
    fetcher,
  );

  useEffect(() => {
    if (open) {
      setSelected(
        new Map(
          currentDocuments.map((doc) => [doc.document_id, doc.allow_download]),
        ),
      );
    }
  }, [open, currentDocuments]);

  function toggleDocument(id: string) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, true);
      }
      return next;
    });
  }

  async function handleSave() {
    setError(null);

    if (selected.size === 0) {
      setError("Selecione ao menos um documento.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(
        Array.from(selected.entries()).map(([document_id, allow_download]) => ({
          document_id,
          allow_download,
        })),
      );
      setOpen(false);
    } catch {
      setError("Não foi possível salvar os documentos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Gerenciar documentos
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gerenciar documentos</DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
            {!data && (
              <p className="p-2 text-sm text-muted-foreground">
                Carregando documentos...
              </p>
            )}
            {data?.documents.map((document) => (
              <label
                key={document.id}
                htmlFor={`manage-doc-${document.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
              >
                <Checkbox
                  id={`manage-doc-${document.id}`}
                  checked={selected.has(document.id)}
                  onCheckedChange={() => toggleDocument(document.id)}
                />
                <span className="truncate text-sm">{document.title}</span>
              </label>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
