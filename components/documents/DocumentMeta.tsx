"use client";

import { useState } from "react";
import { EditDocumentForm } from "@/components/documents/EditDocumentForm";
import { Button } from "@/components/ui/button";
import { formatFileSize, formatDate } from "@/lib/formatters";
import type { DocumentResponse } from "@/types/index";

interface DocumentMetaProps {
  doc: DocumentResponse;
  onUpdated: (doc: DocumentResponse) => void;
  canEdit: boolean;
}

export function DocumentMeta({ doc, onUpdated, canEdit }: DocumentMetaProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <EditDocumentForm
        doc={doc}
        onCancel={() => setIsEditing(false)}
        onSaved={(updated) => {
          onUpdated(updated);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="mt-1 text-muted-foreground">{doc.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {doc.mime_type} · {formatFileSize(doc.size_bytes)}
        {doc.page_count !== null && ` · ${doc.page_count} páginas`}
        {` · Enviado em ${formatDate(doc.created_at)}`}
      </p>
    </div>
  );
}
