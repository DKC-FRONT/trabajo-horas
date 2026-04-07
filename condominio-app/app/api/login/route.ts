import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  password: string;
  rol: string;
  casa_id?: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { correo, password } = body;

    if (!correo || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<any[]>(
      'SELECT id, nombre, correo, password, rol, casa_id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });
    }

    const user: Usuario = rows[0];

    // ⚠️ Reemplazar por bcrypt cuando estés listo
    if (user.password !== password) {
      return NextResponse.json({ error: 'Credenciales incorrectas.' }, { status: 401 });
    }

    const userData = {
      id:      user.id,
      nombre:  user.nombre,
      correo:  user.correo,
      rol:     user.rol,
      casa_id: user.casa_id || null,
    };

    const res = NextResponse.json(
      { message: 'Login exitoso.', user: userData },
      { status: 200 }
    );

    // ── Cookie de sesión para el middleware ──────────────────────────────
    res.cookies.set('session', JSON.stringify(userData), {
      httpOnly: true,        // no accesible desde JS del navegador
      secure: false,         // true en producción (HTTPS)
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,  // 8 horas
      path: '/',
    });

    return res;

  } catch (error) {
    console.error('[POST /api/login]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function DELETE() {
  const res = NextResponse.json({ message: 'Sesión cerrada.' });
  res.cookies.delete('session');
  return res;
}