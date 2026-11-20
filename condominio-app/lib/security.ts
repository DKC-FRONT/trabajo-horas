import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ═══════════════════════════════════════════════════════════════
// MANEJO SEGURO DE ERRORES
// ═══════════════════════════════════════════════════════════════

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): NextResponse {
  // Errores de validación Zod
  if (error instanceof ZodError) {
    const issues = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return NextResponse.json(
      {
        error: 'Validación fallida',
        code: 'VALIDATION_ERROR',
        issues
      },
      { status: 400 }
    );
  }

  // Errores API personalizados
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    );
  }

  // Error genérico - no revelar detalles internos
  console.error('[Unhandled Error]', error);

  return NextResponse.json(
    {
      error: 'Error interno del servidor',
      code: 'INTERNAL_SERVER_ERROR'
    },
    { status: 500 }
  );
}

// ═══════════════════════════════════════════════════════════════
// SANITIZACIÓN DE ERRORES
// ═══════════════════════════════════════════════════════════════

export function sanitizeError(error: any): string {
  if (typeof error === 'string') {
    return 'Error al procesar solicitud';
  }

  if (error?.message) {
    // Ocultar detalles técnicos
    if (error.message.includes('UNIQUE violation')) {
      return 'Este registro ya existe';
    }
    if (error.message.includes('Foreign key')) {
      return 'Referencia inválida';
    }
  }

  return 'Error al procesar solicitud';
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE ENTRADA
// ═══════════════════════════════════════════════════════════════

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateMesAnio(mes: number, anio: number): boolean {
  if (mes < 1 || mes > 12) return false;
  if (anio < 2000 || anio > 2100) return false;
  return true;
}

export function validateHora(hora: string): boolean {
  const [h, m] = hora.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

export function validateFecha(fecha: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return false;

  const date = new Date(fecha);
  return date instanceof Date && !isNaN(date.getTime());
}

// ═══════════════════════════════════════════════════════════════
// VERIFICACIÓN DE PROPIEDAD
// ═══════════════════════════════════════════════════════════════

export async function checkOwnership(
  supabase: any,
  userId: string,
  casaId: number
): Promise<boolean> {
  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('casa_id')
      .eq('id', userId)
      .single();

    if (error || !usuario) return false;

    // Si es admin (casa_id null), tiene acceso a todo
    if (usuario.casa_id === null) return true;

    // Si no es admin, solo puede acceder su propia casa
    return usuario.casa_id === casaId;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// VERIFICACIÓN DE HEADERS DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

export function validateOrigin(request: any): boolean {
  const origin = request.headers.get('origin');

  // En desarrollo, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    return !origin || origin.includes('localhost') || origin.includes('127.0.0.1');
  }

  // En producción, validar origen explícitamente
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
  return allowedOrigins.includes(origin || '');
}
