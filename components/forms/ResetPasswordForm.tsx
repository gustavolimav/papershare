"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordFormProps {
  token: string;
}

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function validate(fields: {
  password: string;
  confirmPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (fields.password.length < 8) {
    errors.password = "A senha deve ter no mínimo 8 caracteres.";
  }

  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  return errors;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpiredOrInvalid, setIsExpiredOrInvalid] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const errors = validate({ password, confirmPassword });
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/v1/password-reset/${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );

      if (response.status === 404) {
        setIsExpiredOrInvalid(true);
        return;
      }

      if (response.status === 429) {
        setFormError("Muitas tentativas. Aguarde um momento.");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFormError(body?.message ?? "Não foi possível redefinir a senha.");
        return;
      }

      router.push("/login?password-reset=success");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isExpiredOrInvalid) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Este link de redefinição é inválido ou já expirou.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Solicitar um novo link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className="h-10 pr-9"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p
            id="password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          className="h-10"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={
            fieldErrors.confirmPassword ? "confirm-password-error" : undefined
          }
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && (
          <p
            id="confirm-password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
