"use client";

import useSWR from "swr";
import type { StatusResponse } from "@/types/index";

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/v1/status");
  return response.json();
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR<StatusResponse>("status", fetchStatus, {
    refreshInterval: 2000,
  });

  let updatedAtText = "Carregando...";

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }

  return <div>Última atualizacao: {updatedAtText}</div>;
}

function DatabaseStatus() {
  const { data } = useSWR<StatusResponse>("status", fetchStatus, {
    refreshInterval: 2000,
  });

  const version = data?.dependencies?.database?.version || "Carregando...";
  const maxConnections =
    data?.dependencies?.database?.max_connections || "Carregando...";
  const openedConnections =
    data?.dependencies?.database?.opened_connections || "Carregando...";

  return (
    <>
      <h2>Banco de dados</h2>
      <div>Versão: {version}</div>
      <div>Conexões máximas: {maxConnections}</div>
      <div>Conexões abertas: {openedConnections}</div>
    </>
  );
}
