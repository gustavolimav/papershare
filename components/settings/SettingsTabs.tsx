"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type TabId =
  | "perfil"
  | "ia"
  | "equipe"
  | "faturamento"
  | "perigo"
  | "migrations"
  | "feature-flags";

const TAB_META: { id: TabId; label: string; destructive?: boolean }[] = [
  { id: "perfil", label: "Perfil" },
  { id: "ia", label: "Chave de IA" },
  { id: "equipe", label: "Equipe" },
  { id: "faturamento", label: "Faturamento" },
  { id: "perigo", label: "Zona de perigo", destructive: true },
  { id: "migrations", label: "Migrations" },
  { id: "feature-flags", label: "Feature flags" },
];

interface SettingsTabsProps {
  perfil: React.ReactNode;
  ia: React.ReactNode;
  equipe: React.ReactNode;
  faturamento: React.ReactNode;
  perigo: React.ReactNode;
  migrations?: React.ReactNode;
  featureFlags?: React.ReactNode;
}

// Panels for every tab stay mounted at all times — only visibility toggles
// via CSS (`hidden`/`block`). This preserves in-progress form state (e.g. a
// half-filled profile edit) when switching tabs, matching today's behavior
// where everything is simply scrolled rather than unmounted.
export function SettingsTabs({
  perfil,
  ia,
  equipe,
  faturamento,
  perigo,
  migrations,
  featureFlags,
}: SettingsTabsProps) {
  const panels: Partial<Record<TabId, React.ReactNode>> = {
    perfil,
    ia,
    equipe,
    faturamento,
    perigo,
    migrations,
    "feature-flags": featureFlags,
  };

  // Superadmin-only tabs simply aren't passed a panel for non-superadmins —
  // filter them out entirely rather than rendering an empty tab.
  const tabs = TAB_META.filter((tab) => panels[tab.id] !== undefined);

  const [active, setActive] = useState<TabId>("perfil");

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <nav
        aria-label="Seções de configurações"
        className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors",
                tab.destructive
                  ? isActive
                    ? "bg-destructive/10 text-destructive"
                    : "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  : isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {tabs.map((tab) => (
          <div key={tab.id} className={active === tab.id ? "block" : "hidden"}>
            {panels[tab.id]}
          </div>
        ))}
      </div>
    </div>
  );
}
