"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunMigration } from "@/types/index";

export function MigrationsPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const {
    data: pendingMigrations,
    error,
    isLoading,
    mutate,
  } = useSWR<RunMigration[]>("/api/v1/migrations", fetcher);

  async function handleRun() {
    setIsRunning(true);

    try {
      const response = await fetch("/api/v1/migrations", { method: "POST" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(
          body?.message ?? "Não foi possível executar as migrations.",
        );
        return;
      }

      const applied: RunMigration[] = await response.json();

      toast.success(
        applied.length > 0
          ? `${applied.length} migration${applied.length > 1 ? "s" : ""} executada${applied.length > 1 ? "s" : ""} com sucesso.`
          : "Nenhuma migration pendente.",
      );

      await mutate();
    } finally {
      setIsRunning(false);
    }
  }

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Não foi possível carregar as migrations pendentes.
      </p>
    );
  }

  const pending = pendingMigrations ?? [];

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {pending.length > 0
            ? `${pending.length} migration${pending.length > 1 ? "s" : ""} pendente${pending.length > 1 ? "s" : ""}`
            : "Nenhuma migration pendente"}
        </h2>
        <Button
          type="button"
          onClick={handleRun}
          disabled={isRunning || pending.length === 0}
        >
          {isRunning ? "Executando..." : "Executar pendentes"}
        </Button>
      </div>

      {pending.length > 0 && (
        <ul className="space-y-1">
          {pending.map((migration) => (
            <li
              key={migration.path}
              className="flex items-center justify-between text-sm text-muted-foreground"
            >
              <span>{migration.name}</span>
              <span className="font-mono text-xs">{migration.path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
