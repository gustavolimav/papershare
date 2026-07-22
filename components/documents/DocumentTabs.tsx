import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocumentTabsProps {
  documentId: string;
  active: "overview" | "analytics";
}

// Each tab is a real navigation (next/link to /documents/[id] or its
// /analytics route), not a client-side swap — both URLs keep working
// exactly as before (deep links, tests/e2e/engagement-score.spec.ts
// navigates directly to the analytics URL), this only adds a visual tab
// bar over what were previously two loosely-connected screens.
export function DocumentTabs({ documentId, active }: DocumentTabsProps) {
  return (
    <div className="mb-6 flex gap-6 border-b">
      <Link
        href={`/documents/${documentId}`}
        className={cn(
          "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
          active === "overview"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Visão geral
      </Link>
      <Link
        href={`/documents/${documentId}/analytics`}
        className={cn(
          "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
          active === "analytics"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        Análises
      </Link>
    </div>
  );
}
