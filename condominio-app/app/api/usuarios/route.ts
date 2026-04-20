import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function GET() {
  try {
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
      .order('creado_el', { ascending: false });

    if (error) throw error;

    // Aplanar el resultado para mantener compatibilidad con el frontend
    const formattedData = data.map((item: any) => ({
      ...item,
      nombre: item.nombre_completo,
      numero_casa: item.casas?.numero_casa
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error('[GET /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al obtener usuarios.' }, { status: 500 });
  }
}

// Nota: El registro se recomienda hacer vía Supabase Auth (RegisterPage). 
// Este POST es para crear perfiles manualmente o por admin.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { nombre, correo, rol, casa_id } = await req.json();

    if (!nombre || !correo || !rol) {
      return NextResponse.json({ error: 'Todos los campos excepto la casa son requeridos.' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{
        nombre_completo: nombre.trim(),
        email: correo.trim(),
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: 'Usuario creado correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id, nombre, correo, rol, casa_id } = await req.json();

    if (!id || !nombre || !correo || !rol) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        nombre_completo: nombre.trim(),
        email: correo.trim(),
        rol: rol,
        casa_id: casa_id ? Number(casa_id) : null
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Usuario actualizado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al actualizar el usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Usuario eliminado.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al eliminar usuario.' }, { status: 500 });
  }
}
