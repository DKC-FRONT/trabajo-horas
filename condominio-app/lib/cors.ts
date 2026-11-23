import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// CORS Y HEADERS DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════

const isDevelopment = process.env.NODE_ENV === 'development';

const ALLOWED_ORIGINS = isDevelopment
  ? ['http://localhost:3000', 'http://127.0.0.1:3000']
  : (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevenir clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevenir MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Protección XSS (navegadores antiguos)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (antes Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // HSTS (en producción)
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // CSP (solo en producción - en desarrollo Next.js necesita eval)
  if (!isDevelopment) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    );
  }

  return response;
}

export function corsMiddleware(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const method = request.method;

  // Verificar si el origen es permitido
  const isOriginAllowed = !origin || ALLOWED_ORIGINS.includes(origin);

  // Responder a preflight requests (OPTIONS)
  if (method === 'OPTIONS') {
    if (!isOriginAllowed) {
      return NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
    }

    const response = new NextResponse(null, { status: 204 });
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  }

  // Validar CORS en requests reales
  if (!isOriginAllowed) {
    return NextResponse.json(
      { error: 'CORS policy violation' },
      { status: 403 }
    );
  }

  return null;
}

export function addCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}
