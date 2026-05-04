import { createClient } from '@/lib/server';
import { NextResponse } from 'next/server';

type RolPermitido = 'admin' | 'trabajador' | 'residente' | 'extras';

/**
 * Verifica que el usuario que llama a una API:
 *  1. Tenga sesión activa (autenticado)
 *  2. Tenga uno de los roles permitidos
 * 
 * @returns { user, profile } si todo está bien, o un NextResponse de error
 */
export async function verifyRole(rolesPermitidos: RolPermitido[]) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: NextResponse.json(
          { error: 'No autenticado. Inicie sesión.' },
          { status: 401 }
        )
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('id, rol, nombre_completo')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        error: NextResponse.json(
          { error: 'Perfil de usuario no encontrado.' },
          { status: 403 }
        )
      };
    }

    if (!rolesPermitidos.includes(profile.rol as RolPermitido)) {
      return {
        error: NextResponse.json(
          { error: 'Sin permisos para esta acción.' },
          { status: 403 }
        )
      };
    }

    return { user, profile };
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Error de autenticación.' },
        { status: 500 }
      )
    };
  }
}
