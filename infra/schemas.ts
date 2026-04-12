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

export const documentUpdateSchema = z
  .object({
    title: z
      .string()
      .min(1, "O 'title' não pode ser vazio.")
      .max(255, "O 'title' deve ter no máximo 255 caracteres.")
      .optional(),
    description: z
      .string()
      .max(1000, "A 'description' deve ter no máximo 1000 caracteres.")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser fornecido para atualização.",
  });

export const shareLinkCreateSchema = z.object({
  label: z
    .string()
    .min(1, "O 'label' não pode ser vazio.")
    .max(255, "O 'label' deve ter no máximo 255 caracteres.")
    .optional(),
  password: z.string().min(1, "A 'password' não pode ser vazia.").optional(),
  expires_at: z
    .string()
    .datetime({ message: "O 'expires_at' deve ser uma data ISO 8601 válida." })
    .transform((s) => new Date(s))
    .optional(),
  allow_download: z.boolean().optional(),
});

export const shareLinkUpdateSchema = z
  .object({
    label: z
      .string()
      .min(1, "O 'label' não pode ser vazio.")
      .max(255, "O 'label' deve ter no máximo 255 caracteres.")
      .optional(),
    password: z
      .string()
      .min(1, "A 'password' não pode ser vazia.")
      .nullable()
      .optional(),
    expires_at: z
      .string()
      .datetime({
        message: "O 'expires_at' deve ser uma data ISO 8601 válida.",
      })
      .transform((s) => new Date(s))
      .nullable()
      .optional(),
    allow_download: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pelo menos um campo deve ser fornecido para atualização.",
  });

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_MB ?? 50) * 1024 * 1024;

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new ValidationError({
      message: firstError?.message ?? "Dados inválidos.",
      action: "Corrija os dados enviados e tente novamente.",
    });
  }

  return result.data;
}
