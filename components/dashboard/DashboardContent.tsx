"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DocumentList } from "@/components/documents/DocumentList";

// Owns the search box's state so it can sit in the header row next to the
// title, matching the design prototype's layout — the title and search
// used to be two components apart (a server-rendered <h1> and a client
// DocumentList with its own internal search state).
export function DashboardContent() {
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Meus documentos
        </h1>
        <Input
          type="search"
          placeholder="Buscar documentos..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
          aria-label="Buscar documentos"
        />
      </div>
      <DashboardStats />
      <DocumentList search={search} />
    </div>
  );
}
