"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ViewerCardShell } from "@/components/viewer/ViewerCardShell";

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
    <ViewerCardShell>
      <Card>
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="font-heading text-xl">
            Este documento é protegido
          </CardTitle>
          <CardDescription>
            Digite a senha para visualizar o conteúdo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
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
        </CardContent>
      </Card>
    </ViewerCardShell>
  );
}
