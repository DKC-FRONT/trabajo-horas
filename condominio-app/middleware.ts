import { NextRequest, NextResponse } from 'next/server';

// Rutas públicas — no requieren sesión
const PUBLIC_ROUTES = ['/', '/login'];

// Rutas y los roles que pueden acceder
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/dashboard':                    ['admin', 'trabajador', 'residente'],
  '/dashboard/lecturas':           ['admin', 'trabajador'],
  '/dashboard/casas':              ['admin', 'trabajador'],
  '/dashboard/reportes':           ['admin', 'trabajador'],
  '/dashboard/avisos':             ['admin', 'residente'],
  '/dashboard/reservas':           ['admin', 'residente'],
  '/dashboard/mis-lecturas':       ['residente'],
  '/dashboard/usuarios':           ['admin'],
  '/dashboard/configuracion':      ['admin'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dejar pasar rutas públicas y archivos estáticos
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Leer sesión desde cookie (ver nota abajo)
  const sessionCookie = req.cookies.get('session')?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  let user: { rol?: string } = {};
  try {
    user = JSON.parse(sessionCookie);
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const rol = user?.rol;
  if (!rol) return NextResponse.redirect(new URL('/login', req.url));

  // Verificar permiso para la ruta actual
  const allowedRoles = PROTECTED_ROUTES[pathname];
  if (allowedRoles && !allowedRoles.includes(rol)) {
    // No tiene permiso → redirigir al dashboard general
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};