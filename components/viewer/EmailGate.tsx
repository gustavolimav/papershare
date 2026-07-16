"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailGateProps {
  onSubmit: (email: string) => void;
  error?: string | undefined;
  isSubmitting?: boolean;
}

export function EmailGate({ onSubmit, error, isSubmitting }: EmailGateProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(email);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Antes de continuar</h1>
      <p className="text-center text-sm text-muted-foreground">
        Informe seu email para visualizar este documento.
      </p>
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div className="space-y-2">
          <Label htmlFor="viewer-email">Email</Label>
          <Input
            id="viewer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Verificando..." : "Acessar documento"}
        </Button>
      </form>
    </div>
  );
}
