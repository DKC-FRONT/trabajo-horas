import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { verifyRole } from '@/lib/verifyRole';
import { handleAPIError } from '@/lib/security';
import { addSecurityHeaders, addCORSHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  try {
    // ✅ VERIFICACIÓN DE AUTENTICACIÓN Y ROLES
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nombre_completo,
        email,
        rol,
        casa_id,
        casas (numero_casa)
      `)
      .order('nombre_completo', { ascending: true });

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      id: item.id,
      nombre_completo: item.nombre_completo,
      email: item.email,
      rol: item.rol,
      casa_id: item.casa_id,
      numero_casa: item.casas?.numero_casa
    }));

    const response = NextResponse.json(formattedData, { status: 200 });
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { nombre, correo, rol, casa_id } = await req.json();

    if (!nombre || !correo || !rol) {
      return NextResponse.json(
        { error: 'Todos los campos excepto la casa son requeridos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const allowedRoles = ['admin', 'trabajador', 'residente', 'extras'];
    if (!allowedRoles.includes(rol)) {
      return NextResponse.json(
        { error: 'Rol inválido.', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(correo))) {
      return NextResponse.json(
        { error: 'Correo inválido.', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{
        nombre_completo: String(nombre).trim(),
        email: String(correo).trim().toLowerCase(),
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      }]);

    if (insertError) {
      if (insertError.message.includes('UNIQUE')) {
        return NextResponse.json(
          { error: 'Este email ya existe.', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    const response = NextResponse.json(
      { message: 'Usuario creado correctamente.' },
      { status: 201 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { id, nombre, correo, rol, casa_id } = await req.json();

    if (!id || !nombre || !correo || !rol) {
      return NextResponse.json(
        { error: 'Datos incompletos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const allowedRoles = ['admin', 'trabajador', 'residente', 'extras'];
    if (!allowedRoles.includes(rol)) {
      return NextResponse.json(
        { error: 'Rol inválido.', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(correo))) {
      return NextResponse.json(
        { error: 'Correo inválido.', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        nombre_completo: String(nombre).trim(),
        email: String(correo).trim().toLowerCase(),
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      })
      .eq('id', id);

    if (updateError) throw updateError;

    const response = NextResponse.json(
      { message: 'Usuario actualizado correctamente.' },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID inválido.', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    const response = NextResponse.json(
      { message: 'Usuario eliminado.' },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}
