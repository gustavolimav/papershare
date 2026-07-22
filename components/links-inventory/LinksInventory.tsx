"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Copy } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { useWorkspaces } from "@/lib/useWorkspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type {
  WorkspaceLinkSummary,
  WorkspaceLinksResponse,
} from "@/types/index";

const PER_PAGE = 50;

function publicUrlFor(token: string): string {
  return typeof window !== "undefined"
    ? `${window.location.origin}/view/${token}`
    : `/view/${token}`;
}

export function LinksInventory() {
  const { activeWorkspace } = useWorkspaces();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<WorkspaceLinksResponse>(
    activeWorkspace
      ? `/api/v1/workspaces/${activeWorkspace.id}/links?page=1&per_page=${PER_PAGE}`
      : null,
    fetcher,
  );

  async function handleCopy(link: WorkspaceLinkSummary) {
    await navigator.clipboard.writeText(publicUrlFor(link.token));
    setCopiedId(link.id);
    setTimeout(
      () => setCopiedId((current) => (current === link.id ? null : current)),
      1500,
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar os links.
      </p>
    );
  }

  if (!data || data.links.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nenhum link criado ainda. Compartilhe um documento para gerar um link.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Link</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Visualiz.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.links.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-mono text-sm">
                {publicUrlFor(link.token).replace(/^https?:\/\//, "")}
              </TableCell>
              <TableCell className="font-medium">
                {link.document_title}
              </TableCell>
              <TableCell>{link.view_count}</TableCell>
              <TableCell>
                {link.status === "active" ? (
                  <Badge className="border-score-good/20 bg-score-good/15 text-score-good">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="destructive">Expirado</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(link)}
                >
                  {copiedId === link.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar link
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
