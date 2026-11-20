import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING EN MEMORIA
// Nota: Para producción, usar @upstash/ratelimit con Redis
// ═══════════════════════════════════════════════════════════════

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const CLEANUP_INTERVAL = 60000; // Limpiar cada minuto

setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, CLEANUP_INTERVAL);

export interface RateLimitConfig {
  window: number; // ms
  limit: number; // requests
}

export const RATE_LIMITS = {
  login: { window: 15 * 60 * 1000, limit: 5 }, // 5 intentos en 15 min
  api: { window: 60 * 1000, limit: 100 }, // 100 requests por minuto
  upload: { window: 60 * 1000, limit: 10 }, // 10 uploads por minuto
};

export function getRateLimitKey(
  request: NextRequest,
  scope: string
): string {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  return `${scope}:${ip}`;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + config.window
    };
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: store[key].resetTime
    };
  }

  const record = store[key];

  // Si la ventana expiró, resetear
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + config.window;
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: record.resetTime
    };
  }

  // Si llegó al límite, rechazar
  if (record.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  // Incrementar contador
  record.count++;
  return {
    allowed: true,
    remaining: config.limit - record.count,
    resetTime: record.resetTime
  };
}

export function rateLimitMiddleware(config: RateLimitConfig) {
  return (request: NextRequest) => {
    const key = getRateLimitKey(request, 'api');
    const { allowed, resetTime } = checkRateLimit(key, config);

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intenta más tarde.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString()
          }
        }
      );
    }

    return null;
  };
}

export function loginRateLimitMiddleware(request: NextRequest) {
  const key = getRateLimitKey(request, 'login');
  const { allowed, resetTime } = checkRateLimit(key, RATE_LIMITS.login);

  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Demasiados intentos de login. Intenta en ' + retryAfter + ' segundos.',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED'
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString()
        }
      }
    );
  }

  return null;
}
