"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AiKeyStatusResponse } from "@/types/index";

interface AiSettingsFormProps {
  username: string;
}

export function AiSettingsForm({ username }: AiSettingsFormProps) {
  const key = `/api/v1/users/${username}/ai-key`;
  const { data, mutate } = useSWR<AiKeyStatusResponse>(key, fetcher);
  const [apiKey, setApiKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (apiKey.length < 20) {
      setFormError("A chave informada parece inválida.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setFormError(
          responseBody?.message ?? "Não foi possível salvar a chave.",
        );
        return;
      }

      setApiKey("");
      await mutate();
      toast.success("Chave de IA salva com sucesso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);

    try {
      const response = await fetch(key, { method: "DELETE" });

      if (!response.ok) {
        toast.error("Não foi possível remover a chave.");
        return;
      }

      await mutate();
      toast.success("Chave de IA removida.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Status:</p>
        <Badge variant={data?.configured ? "default" : "outline"}>
          {data?.configured ? "Configurada" : "Não configurada"}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure sua própria chave da API da Anthropic para habilitar os
        recursos de IA (resumo automático, chat sobre o documento, insights de
        analytics e sugestões de e-mail) nos seus documentos. Sua chave é
        armazenada de forma criptografada e nunca é exibida novamente após
        salva; o uso da IA é cobrado pela Anthropic diretamente na sua conta.
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="ai-api-key">Chave da API da Anthropic</Label>
        <div className="flex items-center gap-2">
          <Input
            id="ai-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              data?.configured
                ? "Deixe em branco para manter a atual"
                : "sk-ant-..."
            }
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
      </form>

      {data?.configured && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? "Removendo..." : "Remover chave"}
        </Button>
      )}
    </div>
  );
}
