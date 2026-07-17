"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DocumentMeta } from "@/components/documents/DocumentMeta";
import { SummaryCard } from "@/components/documents/SummaryCard";
import { ShareLinkList } from "@/components/share-links/ShareLinkList";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import type { DocumentResponse } from "@/types/index";

interface DocumentDetailViewProps {
  initialDocument: DocumentResponse;
}

export function DocumentDetailView({
  initialDocument,
}: DocumentDetailViewProps) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDocument);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/documents/${doc.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard");
        return;
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  return (
    <div className="space-y-8">
      <DocumentMeta doc={doc} onUpdated={setDoc} />

      <SummaryCard doc={doc} onUpdated={setDoc} />

      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setIsDeleteOpen(true)}
      >
        <Trash2 className="mr-1 h-4 w-4" /> Excluir documento
      </Button>

      <Separator />

      <ShareLinkList documentId={doc.id} />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento e seus links de
              compartilhamento deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
