"use client";

import { useState } from "react";
import useSWR from "swr";
import { Mail, Copy } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { useAiKeyConfigured } from "@/lib/useAiKeyConfigured";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  FollowUpEmailSuggestion,
  WorkspaceContactSummary,
  WorkspaceContactsResponse,
} from "@/types/index";

const PER_PAGE = 50;

function scoreBadgeClass(score: number): string {
  if (score >= 70) {
    return "border-score-good/20 bg-score-good/15 text-score-good";
  }
  if (score >= 40) {
    return "border-score-warn/20 bg-score-warn/15 text-score-warn";
  }
  return "border-score-critical/20 bg-score-critical/15 text-score-critical";
}

function initialFor(contact: WorkspaceContactSummary): string {
  const source = contact.viewer_name ?? contact.viewer_email;
  return source.trim()[0]!.toUpperCase();
}

function relativeTimeFor(date: Date | string): string {
  const diffMinutes = Math.max(
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60)),
    0,
  );
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `visto há ${Math.max(diffMinutes, 1)}min`;
  }
  if (diffHours < 24) {
    return `visto há ${diffHours}h`;
  }
  if (diffDays === 1) {
    return "visto ontem";
  }
  if (diffDays < 7) {
    return `visto há ${diffDays} dias`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  return `visto há ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;
}

export function ContactsList() {
  const { activeWorkspace } = useWorkspaces();

  const { data, error, isLoading } = useSWR<WorkspaceContactsResponse>(
    activeWorkspace
      ? `/api/v1/workspaces/${activeWorkspace.id}/contacts?page=1&per_page=${PER_PAGE}`
      : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar os contatos.
      </p>
    );
  }

  if (!data || data.contacts.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nenhum contato ainda. Contatos aparecem aqui quando um visitante informa
        o e-mail ao acessar um link.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      {data.contacts.map((contact, index) => (
        <ContactRow
          key={contact.viewer_email}
          contact={contact}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
}

interface ContactRowProps {
  contact: WorkspaceContactSummary;
  isFirst: boolean;
}

function ContactRow({ contact, isFirst }: ContactRowProps) {
  const aiConfigured = useAiKeyConfigured();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<FollowUpEmailSuggestion | null>(
    null,
  );
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSuggest() {
    if (!contact.most_recent_viewer_fingerprint) {
      return;
    }

    setIsSuggesting(true);
    setSuggestError(null);

    try {
      const response = await fetch(
        `/api/v1/documents/${contact.most_recent_document_id}/links/${contact.most_recent_link_id}/followup-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            viewer_fingerprint: contact.most_recent_viewer_fingerprint,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setSuggestError(body?.message ?? "Não foi possível gerar a sugestão.");
        return;
      }

      setSuggestion(await response.json());
    } finally {
      setIsSuggesting(false);
    }
  }

  function handleCopy() {
    if (!suggestion) {
      return;
    }
    navigator.clipboard.writeText(
      `${suggestion.subject}\n\n${suggestion.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("space-y-2 px-4 py-3", !isFirst && "border-t")}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
          {initialFor(contact)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {contact.viewer_name ?? contact.viewer_email}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {contact.viewer_email}
          </p>
        </div>
        <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
          {contact.document_count} documento
          {contact.document_count === 1 ? "" : "s"} ·{" "}
          {relativeTimeFor(contact.last_viewed_at)}
        </span>
        <span
          className={cn(
            "inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            scoreBadgeClass(contact.engagement_score),
          )}
        >
          {contact.engagement_score}
        </span>
        {aiConfigured &&
          contact.most_recent_viewer_fingerprint &&
          !suggestion && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggest}
              disabled={isSuggesting}
            >
              <Mail className="h-3.5 w-3.5" />
              {isSuggesting ? "Gerando..." : "Gerar follow-up"}
            </Button>
          )}
      </div>

      {suggestError && (
        <p className="text-xs text-destructive">{suggestError}</p>
      )}

      {suggestion && (
        <div className="space-y-2 rounded-md bg-muted/30 p-3 text-sm">
          <p className="font-medium">{suggestion.subject}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {suggestion.body}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      )}
    </div>
  );
}
