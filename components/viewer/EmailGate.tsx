"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
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
    <ViewerCardShell>
      <Card>
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="font-heading text-xl">
            Antes de continuar
          </CardTitle>
          <CardDescription>
            Informe seu email para visualizar este documento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
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
        </CardContent>
      </Card>
    </ViewerCardShell>
  );
}
