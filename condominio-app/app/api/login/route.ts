import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { handleAPIError, validateEmail } from '@/lib/security';
import { addSecurityHeaders, addCORSHeaders } from '@/lib/cors';
import { loginRateLimitMiddleware, getRateLimitKey, checkRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  try {
    // ✅ RATE LIMITING EN LOGIN
    const rateLimitResponse = loginRateLimitMiddleware(req);
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { correo, password } = await req.json();

    if (!correo || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    if (!validateEmail(correo)) {
      return NextResponse.json(
        { error: 'Correo inválido.', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Contraseña inválida.', code: 'INVALID_PASSWORD' },
        { status: 400 }
      );
    }

    // 1. ✅ Iniciar sesión con Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: correo.toLowerCase(),
      password: password,
    });

    if (authError) {
      // No revelar si el email existe o no (prevenir enumeración de usuarios)
      return NextResponse.json(
        { error: 'Credenciales incorrectas.', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // 2. ✅ Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol, casa_id, casas(numero_casa)')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      console.error('[Login] Profile error:', profileError);
      return NextResponse.json(
        { error: 'Error al obtener perfil.', code: 'PROFILE_ERROR' },
        { status: 500 }
      );
    }

    const userData = {
      id: data.user.id,
      nombre: profile.nombre_completo,
      correo: data.user.email,
      rol: profile.rol,
      casa_id: profile.casa_id,
      numero_casa: (profile as any)?.casas?.numero_casa || null
    };

    const response = NextResponse.json(
      { message: 'Login exitoso.', user: userData },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));

  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json(
      { message: 'Sesión cerrada.' },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}
