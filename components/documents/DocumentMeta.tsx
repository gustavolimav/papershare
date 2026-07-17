"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          {doc.description && (
            <p className="mt-1 text-muted-foreground">{doc.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/documents/${doc.id}/analytics`}>
              <BarChart3 className="mr-1 h-4 w-4" /> Analytics
            </Link>
          </Button>
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
