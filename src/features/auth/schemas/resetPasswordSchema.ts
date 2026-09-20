import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
      .regex(/[A-Z\p{Lu}]/u, {
        message: 'La contraseña debe contener al menos una letra mayúscula',
      })
      .regex(/[0-9]/, {
        message: 'La contraseña debe contener al menos un número',
      })
      .regex(/[^a-zA-Z0-9\s\p{L}]/u, {
        message: 'La contraseña debe contener al menos un carácter especial',
      }),
    confirmPassword: z.string().min(1, { message: 'Por favor confirma tu nueva contraseña' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type ResetPasswordSchemaInput = z.infer<typeof resetPasswordSchema>;
