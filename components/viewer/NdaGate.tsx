"use client";

import { useState } from "react";
import { FileCheck2 } from "lucide-react";
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
    <ViewerCardShell className="max-w-lg">
      <Card>
        <CardHeader className="items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <CardTitle className="font-heading text-xl">
            Antes de continuar
          </CardTitle>
          <CardDescription>
            Leia o termo abaixo e informe seus dados para aceitar e visualizar o
            documento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-left text-sm whitespace-pre-wrap">
            {ndaText}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2 text-left">
              <Label htmlFor="viewer-name">Nome</Label>
              <Input
                id="viewer-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2 text-left">
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
        </CardContent>
      </Card>
    </ViewerCardShell>
  );
}
