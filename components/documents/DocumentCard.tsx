import Link from "next/link";
import { FileText, FileType, Presentation, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize, formatDate } from "@/lib/formatters";
import type { DocumentResponse } from "@/types/index";

const MIME_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileType,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    Presentation,
};

interface DocumentCardProps {
  doc: DocumentResponse;
  onDeleteRequest: (doc: DocumentResponse) => void;
}

export function DocumentCard({ doc, onDeleteRequest }: DocumentCardProps) {
  const Icon = MIME_ICONS[doc.mime_type] ?? FileText;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <Icon className="h-8 w-8 shrink-0 text-primary" />

        <div className="min-w-0 flex-1">
          <Link
            href={`/documents/${doc.id}`}
            className="truncate font-medium hover:underline"
          >
            {doc.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(doc.size_bytes)}
            {doc.page_count !== null && ` · ${doc.page_count} páginas`}
            {` · ${formatDate(doc.created_at)}`}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Excluir documento"
          onClick={() => onDeleteRequest(doc)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
