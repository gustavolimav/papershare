"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordGateProps {
  onSubmit: (password: string) => void;
  error?: string | undefined;
  isSubmitting?: boolean;
}

export function PasswordGate({
  onSubmit,
  error,
  isSubmitting,
}: PasswordGateProps) {
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(password);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Este documento é protegido</h1>
      <p className="text-center text-sm text-muted-foreground">
        Digite a senha para visualizar o conteúdo.
      </p>
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div className="space-y-2">
          <Label htmlFor="viewer-password">Senha</Label>
          <Input
            id="viewer-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
