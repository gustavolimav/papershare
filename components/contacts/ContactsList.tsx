"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Phase 14 (Contacts / Viewer Directory) isn't built yet — this is a
// frontend-only mock of the design prototype's "Contatos" screen, rolling
// every viewer up across all documents instead of one link's engagement
// list at a time (today's real list is per-link, on the analytics drawer).
// Swap for a real cross-document viewer query once Phase 14 lands.
interface MockContact {
  id: string;
  initial: string;
  name: string;
  email: string;
  documentCount: number;
  lastSeen: string;
  score: number;
}

const MOCK_CONTACTS: MockContact[] = [
  {
    id: "1",
    initial: "E",
    name: "Elena Vasquez",
    email: "elena@acmeventures.com",
    documentCount: 3,
    lastSeen: "visto há 2h",
    score: 92,
  },
  {
    id: "2",
    initial: "M",
    name: "Marcus Chen",
    email: "marcus@northlake.vc",
    documentCount: 2,
    lastSeen: "visto ontem",
    score: 74,
  },
  {
    id: "3",
    initial: "P",
    name: "Priya Nair",
    email: "priya@brightfund.com",
    documentCount: 1,
    lastSeen: "visto há 5 dias",
    score: 41,
  },
  {
    id: "4",
    initial: "T",
    name: "Tomás Ferreira",
    email: "tomas@koicapital.com",
    documentCount: 2,
    lastSeen: "visto há 1 semana",
    score: 58,
  },
];

function scoreBadgeClass(score: number): string {
  if (score >= 70) {
    return "border-score-good/20 bg-score-good/15 text-score-good";
  }
  if (score >= 40) {
    return "border-score-warn/20 bg-score-warn/15 text-score-warn";
  }
  return "border-score-critical/20 bg-score-critical/15 text-score-critical";
}

export function ContactsList() {
  return (
    <div className="rounded-lg border">
      {MOCK_CONTACTS.map((contact, index) => (
        <div
          key={contact.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            index > 0 && "border-t",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            {contact.initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{contact.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {contact.email}
            </p>
          </div>
          <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
            {contact.documentCount} documento
            {contact.documentCount === 1 ? "" : "s"} · {contact.lastSeen}
          </span>
          <span
            className={cn(
              "inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              scoreBadgeClass(contact.score),
            )}
          >
            {contact.score}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info(
                "Follow-up entre documentos chega na Fase 14 (Contatos).",
              )
            }
          >
            Gerar follow-up
          </Button>
        </div>
      ))}
    </div>
  );
}
