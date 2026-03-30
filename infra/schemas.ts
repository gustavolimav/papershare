import { z } from "zod";
import { ValidationError } from "./errors";

export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, "O 'username' deve ter no mínimo 3 caracteres.")
    .max(30, "O 'username' deve ter no máximo 30 caracteres.")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "O 'username' deve conter apenas letras e números.",
    ),
  email: z
    .string()
    .email("O 'email' informado não é válido.")
    .max(254, "O 'email' deve ter no máximo 254 caracteres."),
  password: z.string().min(8, "A 'password' deve ter no mínimo 8 caracteres."),
});

export const userUpdateSchema = z
  .object({
    username: z
      .string()
      .min(3, "O 'username' deve ter no mínimo 3 caracteres.")
      .max(30, "O 'username' deve ter no máximo 30 caracteres.")
      .regex(
        /^[a-zA-Z0-9]+$/,
        "O 'username' deve conter apenas letras e números.",
      )
      .optional(),
    email: z
      .string()
      .email("O 'email' informado não é válido.")
      .max(254, "O 'email' deve ter no máximo 254 caracteres.")
      .optional(),
    password: z
      .string()
      .min(8, "A 'password' deve ter no mínimo 8 caracteres.")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser fornecido para atualização.",
  });

export const authenticationSchema = z.object({
  email: z.string().email("O 'email' informado não é válido."),
  password: z.string().min(1, "O campo 'password' é obrigatório."),
});

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new ValidationError({
      message: firstError?.message,
      action: "Corrija os dados enviados e tente novamente.",
    });
  }

  return result.data;
}
