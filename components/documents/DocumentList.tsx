"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadZone } from "@/components/documents/UploadZone";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import type { DocumentListResponse, DocumentResponse } from "@/types/index";

const PER_PAGE = 10;

export function DocumentList() {
  const [page, setPage] = useState(1);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<DocumentListResponse>(
    `/api/v1/documents?page=${page}&per_page=${PER_PAGE}`,
    fetcher,
  );

  async function handleConfirmDelete() {
    if (!documentToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await fetch(`/api/v1/documents/${documentToDelete.id}`, {
        method: "DELETE",
      });
      await mutate();
    } finally {
      setIsDeleting(false);
      setDocumentToDelete(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;

  return (
    <div className="space-y-6">
      <UploadZone onUploaded={() => mutate()} />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar seus documentos.
        </p>
      )}

      {data && data.documents.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Nenhum documento ainda. Faça o upload do seu primeiro arquivo.
        </p>
      )}

      {data && data.documents.length > 0 && (
        <div className="space-y-3">
          {data.documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDeleteRequest={setDocumentToDelete}
            />
          ))}
        </div>
      )}

      {data && data.total > PER_PAGE && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <AlertDialog
        open={documentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{documentToDelete?.title}
              &quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
