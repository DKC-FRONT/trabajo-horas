import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════
// ESQUEMAS DE VALIDACIÓN CENTRALIZADOS
// ═══════════════════════════════════════════════════════════════

export const UsuarioSchema = z.object({
  nombre: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo'),
  correo: z.string().email('Email inválido'),
  rol: z.enum(['admin', 'trabajador', 'residente', 'extras'], {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  casa_id: z.number().int().positive('Casa debe ser un número positivo').optional().nullable(),
});

export const LecturaSchema = z.object({
  casa_id: z.number().int().positive('Casa inválida'),
  lectura_anterior: z.number().nonnegative('Lectura anterior no válida'),
  lectura_actual: z.number().nonnegative('Lectura actual no válida'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
});

export const ReservaSchema = z.object({
  casa_id: z.number().int().positive('Casa inválida'),
  area: z.string().min(2, 'Área muy corta').max(50, 'Área muy larga'),
  fecha_reserva: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora debe ser HH:MM'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora debe ser HH:MM'),
  valor: z.number().nonnegative('Valor no válido'),
});

export const CasaSchema = z.object({
  numero_casa: z.string().min(1, 'Número de casa requerido').max(20, 'Número de casa muy largo'),
});

export const ReportesSchema = z.object({
  mes: z.number().int().min(1, 'Mes debe ser 1-12').max(12, 'Mes debe ser 1-12'),
  anio: z.number().int().min(2000, 'Año mínimo 2000').max(2100, 'Año máximo 2100'),
});

export const LoginSchema = z.object({
  correo: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres'),
});

export type Usuario = z.infer<typeof UsuarioSchema>;
export type Lectura = z.infer<typeof LecturaSchema>;
export type Reserva = z.infer<typeof ReservaSchema>;
export type Casa = z.infer<typeof CasaSchema>;
export type Reportes = z.infer<typeof ReportesSchema>;
export type Login = z.infer<typeof LoginSchema>;
