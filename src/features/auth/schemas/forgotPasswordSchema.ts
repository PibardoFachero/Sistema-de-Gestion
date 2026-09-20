import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Por favor ingresa tu correo electrónico' })
    .email({ message: 'Ingresa un correo electrónico válido' }),
});

export type ForgotPasswordSchemaInput = z.infer<typeof forgotPasswordSchema>;
