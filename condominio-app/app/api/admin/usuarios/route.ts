import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin';

/**
 * API DE ADMINISTRACIÓN — Gestión avanzada de usuarios
 * Solo accesible por administradores (debe verificarse la sesión o confiar en que se usa localmente)
 */

export async function POST(req: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const { nombre, correo, password, rol, casa_id } = await req.json();

    if (!nombre || !correo || !password || !rol) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    // 1. Crear el usuario en Supabase Auth con confirmación automática
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: correo,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: nombre }
    });

    if (authError) throw authError;

    // 2. Vincular el rol y la casa en la tabla pública usuarios
    // El trigger ya debería haber creado la fila, pero nos aseguramos del rol y casa
    const { error: profileError } = await adminSupabase
      .from('usuarios')
      .update({
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      })
      .eq('id', authData.user.id);

    if (profileError) throw profileError;

    return NextResponse.json({ message: 'Usuario creado y confirmado correctamente.' }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/admin/usuarios]', error);
    return NextResponse.json({ error: error.message || 'Error al crear usuario.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const { id, nombre, correo, password, rol, casa_id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });

    // 1. Actualizar datos en Auth (Correo y/o Contraseña)
    const updateData: any = {};
    if (correo) updateData.email = correo;
    if (password) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(id, updateData);
      if (authError) throw authError;
    }

    // 2. Actualizar datos en la tabla pública 'usuarios'
    const { error: profileError } = await adminSupabase
      .from('usuarios')
      .update({
        nombre_completo: nombre,
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return NextResponse.json({ message: 'Usuario actualizado correctamente.' }, { status: 200 });

  } catch (error: any) {
    console.error('[PUT /api/admin/usuarios]', error);
    return NextResponse.json({ error: error.message || 'Error al actualizar usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });

    // Eliminar de Auth borrará automáticamente de usuarios por el ON DELETE CASCADE del FK
    const { error } = await adminSupabase.auth.admin.deleteUser(id);
    
    if (error) throw error;

    return NextResponse.json({ message: 'Usuario eliminado por completo.' }, { status: 200 });

  } catch (error: any) {
    console.error('[DELETE /api/admin/usuarios]', error);
    return NextResponse.json({ error: error.message || 'Error al eliminar usuario.' }, { status: 500 });
  }
}
