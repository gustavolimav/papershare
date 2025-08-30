import React from 'react';
import useSWR from 'swr';
import type { StatusResponse } from '../../types/index.js';

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch('/api/v1/status');
  const responseBody = await response.json();
  return responseBody;
}

export default function StatusPage(): React.JSX.Element {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}

function UpdatedAt(): React.JSX.Element {
  const { isLoading, data } = useSWR<StatusResponse>('status', fetchStatus, {
    refreshInterval: 2000,
  });

  let updatedAtText = 'Carregando...';

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString('pt-BR');
  }

  return <div>Última atualizacao: {updatedAtText}</div>;
}

function DatabaseStatus(): React.JSX.Element {
  const { data } = useSWR<StatusResponse>('status', fetchStatus, {
    refreshInterval: 2000,
  });

  const version = data?.dependencies?.database?.version || 'Carregando...';
  const maxConnections =
    data?.dependencies?.database?.max_connections || 'Carregando...';
  const openedConnections =
    data?.dependencies?.database?.opened_connections || 'Carregando...';

  return (
    <>
      <h2>Banco de dados</h2>
      <div>Versão: {version}</div>
      <div>Conexões máximas: {maxConnections}</div>
      <div>Conexões abertas: {openedConnections}</div>
    </>
  );
}
