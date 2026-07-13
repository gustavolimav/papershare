export class FetchError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.info = info;
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const info = await response.json().catch(() => undefined);

    throw new FetchError(
      (info as { message?: string } | undefined)?.message ??
        "Erro ao buscar dados.",
      response.status,
      info,
    );
  }

  return response.json();
}
