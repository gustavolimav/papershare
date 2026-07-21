import Link from "next/link";
import { FileText, FileType, Presentation, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import type { DocumentListItem, DocumentResponse } from "@/types/index";

const MIME_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    FileType,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    Presentation,
};

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOC",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPT",
};

// Thresholds for the score badge color: >=80 good, 50-79 warn, <50 critical.
// Matches the acceptance criteria's suggested cutoffs — engagement_score is
// a 0-100 proxy (see models/document.ts), so these bands read the same way
// regardless of which formula ultimately produces the number.
function getScoreBadgeClassName(score: number): string {
  if (score >= 80) {
    return "bg-score-good text-score-good-foreground";
  }

  if (score >= 50) {
    return "bg-score-warn text-score-warn-foreground";
  }

  return "bg-score-critical text-score-critical-foreground";
}

interface DocumentRowProps {
  doc: DocumentListItem;
  // Only meaningful in a shared workspace — hidden entirely for a personal
  // workspace or one where every visible document has the same uploader.
  showUploader: boolean;
  // False for a viewer-role member: the backend already rejects the
  // DELETE, but hiding the button avoids offering an action that just fails.
  canEdit: boolean;
  onDeleteRequest: (doc: DocumentResponse) => void;
}

export function DocumentRow({
  doc,
  showUploader,
  canEdit,
  onDeleteRequest,
}: DocumentRowProps) {
  const Icon = MIME_ICONS[doc.mime_type] ?? FileText;
  const mimeLabel = MIME_LABELS[doc.mime_type] ?? "ARQ";

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link
              href={`/documents/${doc.id}`}
              className="block truncate font-medium hover:underline"
            >
              {doc.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {mimeLabel}
              {showUploader && ` · Enviado por ${doc.uploaded_by_username}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="tabular-nums">{doc.view_count}</TableCell>
      <TableCell className="tabular-nums">{doc.active_link_count}</TableCell>
      <TableCell>
        <Badge className={cn(getScoreBadgeClassName(doc.engagement_score))}>
          {doc.engagement_score}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(doc.updated_at)}
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Excluir documento"
            onClick={() => onDeleteRequest(doc)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
