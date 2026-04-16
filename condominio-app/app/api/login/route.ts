import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { correo, password } = await req.json();

    if (!correo || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos.' },
        { status: 400 }
      );
    }

    // 1. Iniciar sesión con Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: correo,
      password: password,
    });

    if (authError) {
      return NextResponse.json({ error: 'Credenciales incorrectas: ' + authError.message }, { status: 401 });
    }

    // 2. Obtener el perfil extendido del usuario
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol, casa_id, casas(numero_casa)')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
       console.error('[Login] Profile error:', profileError);
    }

    const userData = {
      id:      data.user.id,
      nombre:  profile?.nombre_completo || data.user.email,
      correo:  data.user.email,
      rol:     profile?.rol || 'residente',
      casa_id: profile?.casa_id || null,
      numero_casa: (profile as any)?.casas?.numero_casa || null
    };

    // La cookie de autenticación de Supabase se maneja automáticamente por createServerClient
    // Pero devolvemos los datos del usuario para el estado local del frontend
    return NextResponse.json(
      { message: 'Login exitoso.', user: userData },
      { status: 200 }
    );

  } catch (error) {
    console.error('[POST /api/login]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: 'Sesión cerrada.' });
}