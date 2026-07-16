"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NdaGateProps {
  ndaText: string;
  onSubmit: (name: string, email: string) => void;
  error?: string | undefined;
  isSubmitting?: boolean;
}

export function NdaGate({
  ndaText,
  onSubmit,
  error,
  isSubmitting,
}: NdaGateProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(name, email);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-xl font-semibold">Antes de continuar</h1>
      <p className="text-sm text-muted-foreground">
        Leia o termo abaixo e informe seus dados para aceitar e visualizar o
        documento.
      </p>
      <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
        {ndaText}
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div className="space-y-2">
          <Label htmlFor="viewer-name">Nome</Label>
          <Input
            id="viewer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="viewer-email">Email</Label>
          <Input
            id="viewer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Verificando..." : "Aceitar e continuar"}
        </Button>
      </form>
    </div>
  );
}
