import { cn } from "@/lib/utils";

// Phase 12 (Activity Feed) isn't built yet — this is a frontend-only mock
// of the design prototype's "Atividade" screen, wired to no real events
// table. Swap this static data for a real query once Phase 12 lands.
interface ActivityItem {
  id: string;
  initial: string;
  actorName: string | null;
  actionText: string;
  documentTitle: string;
  detail?: string;
  time: string;
  variant?: "default" | "warning";
}

interface ActivityGroup {
  label: string;
  items: ActivityItem[];
}

const MOCK_ACTIVITY: ActivityGroup[] = [
  {
    label: "Hoje",
    items: [
      {
        id: "1",
        initial: "E",
        actorName: "Elena Vasquez",
        actionText: "visualizou",
        documentTitle: "Series A Deck.pdf",
        detail: "100% lido · 8m 40s",
        time: "14:32",
      },
      {
        id: "2",
        initial: "M",
        actorName: "Marcus Chen",
        actionText: "aceitou o NDA de",
        documentTitle: "Series A Deck.pdf",
        time: "11:05",
      },
      {
        id: "3",
        initial: "J",
        actorName: "Jordan Diaz",
        actionText: "criou um link para",
        documentTitle: "Q3 Board Update.pptx",
        detail: "papershare.io/view/r77tyu",
        time: "09:12",
      },
    ],
  },
  {
    label: "Ontem",
    items: [
      {
        id: "4",
        initial: "P",
        actorName: "Priya Nair",
        actionText: "visualizou",
        documentTitle: "Pricing Proposal.pdf",
        detail: "35% lido · 1m 05s",
        time: "17:48",
      },
      {
        id: "5",
        initial: "!",
        actorName: null,
        actionText: "Tentativa de download bloqueada em",
        documentTitle: "MSA — Acme Corp.docx",
        detail: "por visitante não autorizado",
        time: "15:20",
        variant: "warning",
      },
    ],
  },
  {
    label: "Esta semana",
    items: [
      {
        id: "6",
        initial: "A",
        actorName: "Ana Souza",
        actionText: "enviou",
        documentTitle: "Q3 Board Update.pptx",
        time: "seg",
      },
      {
        id: "7",
        initial: "M",
        actorName: "Marcus Chen",
        actionText: "revisitou",
        documentTitle: "Series A Deck.pdf",
        detail: "2ª visita",
        time: "ter",
      },
    ],
  },
];

export function ActivityFeed() {
  return (
    <div className="space-y-8">
      {MOCK_ACTIVITY.map((group) => (
        <div key={group.label} className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <div className="rounded-lg border">
            {group.items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  index > 0 && "border-t",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    item.variant === "warning"
                      ? "bg-score-warn/15 text-score-warn"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {item.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {item.actorName && (
                      <span className="font-medium">{item.actorName} </span>
                    )}
                    {item.actionText}{" "}
                    <span className="font-medium">{item.documentTitle}</span>
                  </p>
                  {item.detail && (
                    <p className="truncate text-sm text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
