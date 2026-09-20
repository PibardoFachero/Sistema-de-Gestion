import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Por favor ingresa tu contraseña actual' }),
    newPassword: z
      .string()
      .min(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
      .regex(/[A-Z\p{Lu}]/u, {
        message: 'La nueva contraseña debe contener al menos una letra mayúscula',
      })
      .regex(/[0-9]/, {
        message: 'La nueva contraseña debe contener al menos un número',
      })
      .regex(/[^a-zA-Z0-9\s\p{L}]/u, {
        message: 'La nueva contraseña debe contener al menos un carácter especial',
      }),
    confirmPassword: z.string().min(1, { message: 'Por favor confirma tu nueva contraseña' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las nuevas contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña no puede ser igual a tu contraseña actual',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
