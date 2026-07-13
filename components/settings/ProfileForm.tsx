"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserPublic } from "@/types/index";

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

function validate(fields: {
  username: string;
  email: string;
  password: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (fields.username.length < 3 || fields.username.length > 30) {
    errors.username = "O nome de usuário deve ter entre 3 e 30 caracteres.";
  } else if (!/^[a-zA-Z0-9]+$/.test(fields.username)) {
    errors.username = "O nome de usuário deve conter apenas letras e números.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (fields.password && fields.password.length < 8) {
    errors.password = "A senha deve ter no mínimo 8 caracteres.";
  }

  return errors;
}

interface ProfileFormProps {
  user: UserPublic;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { mutateUser } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const errors = validate({ username, email, password });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, string> = { username, email };

      if (password) {
        body.password = password;
      }

      const response = await fetch(`/api/v1/users/${user.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        setFormError(
          responseBody?.message ?? "Não foi possível salvar as alterações.",
        );
        return;
      }

      await mutateUser();
      setPassword("");
      toast.success("Perfil atualizado com sucesso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-username">Nome de usuário</Label>
        <Input
          id="settings-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={!!fieldErrors.username}
        />
        {fieldErrors.username && (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.username}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-email">E-mail</Label>
        <Input
          id="settings-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-password">Nova senha (opcional)</Label>
        <Input
          id="settings-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={!!fieldErrors.password}
          placeholder="Deixe em branco para manter a atual"
        />
        {fieldErrors.password && (
          <p role="alert" className="text-sm text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
