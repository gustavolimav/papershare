"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { fetcher } from "@/lib/fetcher";
import type { DataRoomResponse, DocumentListResponse } from "@/types/index";

interface CreateDataRoomModalProps {
  workspaceId: string;
  onCreated: (room: DataRoomResponse) => void;
}

export function CreateDataRoomModal({
  workspaceId,
  onCreated,
}: CreateDataRoomModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useSWR<DocumentListResponse>(
    open ? "/api/v1/documents?page=1&per_page=100" : null,
    fetcher,
  );

  function toggleDocument(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function reset() {
    setName("");
    setSelectedIds(new Set());
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (selectedIds.size === 0) {
      setError("Selecione ao menos um documento.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/data-rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            document_ids: Array.from(selectedIds),
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Não foi possível criar a data room.");
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Criar data room</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar data room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="dataRoomName">Nome</Label>
              <Input
                id="dataRoomName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Documentos</Label>
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {!data && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Carregando documentos...
                  </p>
                )}
                {data?.documents.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Nenhum documento disponível neste workspace.
                  </p>
                )}
                {data?.documents.map((document) => (
                  <label
                    key={document.id}
                    htmlFor={`doc-${document.id}`}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      id={`doc-${document.id}`}
                      checked={selectedIds.has(document.id)}
                      onCheckedChange={() => toggleDocument(document.id)}
                    />
                    <span className="truncate text-sm">{document.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar data room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
