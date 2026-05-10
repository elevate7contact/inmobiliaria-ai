/**
 * Validation schemas para los formularios de auth.
 * Single source of truth — los usan tanto el cliente (form preview) como el server action.
 */
import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: 'Mínimo 8 caracteres' })
    .regex(/[a-zA-Z]/, { error: 'Debe contener al menos una letra' })
    .regex(/[0-9]/, { error: 'Debe contener al menos un número' }),
  name: z.string().min(2, { error: 'Mínimo 2 caracteres' }).trim(),
  role: z.enum(['SEARCHER', 'REALTOR'], { error: 'Rol requerido' }),
  // RealtorProfile fields (solo si role === 'REALTOR')
  companyName: z.string().min(2).trim().optional(),
});

export const LoginSchema = z.object({
  email: z.email({ error: 'Email inválido' }).trim().toLowerCase(),
  password: z.string().min(1, { error: 'Contraseña requerida' }),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Estado que devuelven los Server Actions a los formularios.
 * Compatible con useActionState de React 19.
 */
export type AuthFormState =
  | {
      ok: false;
      errors?: {
        email?: string[];
        password?: string[];
        name?: string[];
        role?: string[];
        companyName?: string[];
        _form?: string[]; // errores generales (ej: "email ya registrado")
      };
    }
  | {
      ok: true;
      redirectTo: string;
    }
  | undefined;
