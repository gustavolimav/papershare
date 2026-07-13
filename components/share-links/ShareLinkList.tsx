"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ShareLinkCard } from "@/components/share-links/ShareLinkCard";
import { CreateShareLinkModal } from "@/components/share-links/CreateShareLinkModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShareLinkResponse } from "@/types/index";

interface ShareLinkListProps {
  documentId: string;
}

export function ShareLinkList({ documentId }: ShareLinkListProps) {
  const { data, error, isLoading, mutate } = useSWR<ShareLinkResponse[]>(
    `/api/v1/documents/${documentId}/links`,
    fetcher,
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Links de compartilhamento</h2>
        <CreateShareLinkModal
          documentId={documentId}
          onCreated={() => mutate()}
        />
      </div>

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
              onUpdated={() => mutate()}
              onRevoked={() => mutate()}
            />
          ))}
        </div>
      )}
    </section>
  );
}
