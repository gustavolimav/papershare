"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ShareLinkCard } from "@/components/share-links/ShareLinkCard";
import { CreateShareLinkModal } from "@/components/share-links/CreateShareLinkModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShareLinkResponse } from "@/types/index";

interface ShareLinkListProps {
  documentId: string;
  canEdit: boolean;
}

export function ShareLinkList({ documentId, canEdit }: ShareLinkListProps) {
  const { data, error, isLoading, mutate } = useSWR<ShareLinkResponse[]>(
    `/api/v1/documents/${documentId}/links`,
    fetcher,
  );
  const [duplicateFrom, setDuplicateFrom] = useState<ShareLinkResponse | null>(
    null,
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Links de compartilhamento</h2>
        {canEdit && (
          <CreateShareLinkModal
            documentId={documentId}
            onCreated={() => mutate()}
          />
        )}
      </div>

      {/* key forces a remount (and fresh prefill-seeded state) whenever a
          different link is chosen to duplicate. */}
      {canEdit && (
        <CreateShareLinkModal
          key={duplicateFrom?.id ?? "duplicate-none"}
          documentId={documentId}
          prefill={duplicateFrom ?? undefined}
          open={duplicateFrom !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDuplicateFrom(null);
            }
          }}
          onCreated={() => {
            mutate();
            setDuplicateFrom(null);
          }}
        />
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os links.
        </p>
      )}

      {data && data.length === 0 && (
        <p className="py-6 text-center text-muted-foreground">
          Nenhum link de compartilhamento. Crie o primeiro!
        </p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((link) => (
            <ShareLinkCard
              key={link.id}
              link={link}
              canEdit={canEdit}
              onUpdated={() => mutate()}
              onRevoked={() => mutate()}
              onDuplicate={setDuplicateFrom}
            />
          ))}
        </div>
      )}
    </section>
  );
}
