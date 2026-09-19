import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Ingresa un correo electrónico válido' }),
  password: z
    .string()
    .min(1, { message: 'Por favor ingresa tu contraseña' }),
});

export type LoginSchemaInput = z.infer<typeof loginSchema>;
