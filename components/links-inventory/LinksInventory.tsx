"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// Phase 13 (Global Links Inventory) isn't built yet — this is a
// frontend-only mock of the design prototype's "Links" screen, listing
// links across every document instead of one at a time (today's real
// list only shows a single document's links, on its detail page).
// Swap for a real cross-document query once Phase 13 lands.
interface MockLink {
  id: string;
  path: string;
  documentTitle: string;
  views: number;
  status: "ativo" | "expirado";
}

const MOCK_LINKS: MockLink[] = [
  {
    id: "1",
    path: "papershare.io/view/a8f3k2",
    documentTitle: "Series A Deck.pdf",
    views: 88,
    status: "ativo",
  },
  {
    id: "2",
    path: "papershare.io/view/q92lm1",
    documentTitle: "Series A Deck.pdf",
    views: 54,
    status: "ativo",
  },
  {
    id: "3",
    path: "papershare.io/view/z10qwe",
    documentTitle: "MSA — Acme Corp.docx",
    views: 34,
    status: "ativo",
  },
  {
    id: "4",
    path: "papershare.io/view/p55vbn",
    documentTitle: "Q3 Board Update.pptx",
    views: 12,
    status: "ativo",
  },
  {
    id: "5",
    path: "papershare.io/view/r77tyu",
    documentTitle: "Q3 Board Update.pptx",
    views: 76,
    status: "ativo",
  },
  {
    id: "6",
    path: "papershare.io/view/k22asd",
    documentTitle: "Pricing Proposal.pdf",
    views: 12,
    status: "expirado",
  },
];

export function LinksInventory() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(link: MockLink) {
    await navigator.clipboard.writeText(`https://${link.path}`);
    setCopiedId(link.id);
    setTimeout(
      () => setCopiedId((current) => (current === link.id ? null : current)),
      1500,
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
          {MOCK_LINKS.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-mono text-sm">{link.path}</TableCell>
              <TableCell className="font-medium">
                {link.documentTitle}
              </TableCell>
              <TableCell>{link.views}</TableCell>
              <TableCell>
                {link.status === "ativo" ? (
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
