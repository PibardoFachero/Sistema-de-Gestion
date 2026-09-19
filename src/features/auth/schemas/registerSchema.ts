import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
    lastName: z
      .string()
      .trim()
      .min(2, { message: 'El apellido debe tener al menos 2 caracteres' }),
    username: z
      .string()
      .trim()
      .min(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
      .max(30, { message: 'El nombre de usuario no puede tener más de 30 caracteres' })
      .regex(/^[a-zA-Z0-9_.]+$/, {
        message: 'Solo se permiten letras, números, puntos y guiones bajos',
      }),
    email: z
      .string()
      .trim()
      .email({ message: 'Ingresa un correo electrónico válido' }),
    password: z
      .string()
      .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterSchemaInput = z.infer<typeof registerSchema>;
