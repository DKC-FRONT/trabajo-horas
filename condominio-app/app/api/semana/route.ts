import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { verifyRole } from '@/lib/verifyRole';

type Profile = { id: string; rol: string; nombre_completo?: string };

type SemanaTareaBody = {
  semanaKey: string;
  dia: string;
  hora: string;
  descripcion: string;
  id?: string;
  completado?: boolean;
};

export async function GET(req: NextRequest) {
  const auth = await verifyRole(['admin', 'trabajador']);
  if (auth.error) return auth.error;

  const semanaKey = req.nextUrl.searchParams.get('semanaKey') || '';
  if (!semanaKey) {
    return NextResponse.json({ error: 'Falta el parámetro semanaKey.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from('tareas_semana')
      .select('id, semana_key, dia, hora, descripcion, usuario_id, usuario_nombre, completado, created_at')
      .eq('semana_key', semanaKey)
      .order('dia', { ascending: true })
      .order('hora', { ascending: true });

    if (auth.profile.rol !== 'admin') {
      query = query.eq('usuario_id', auth.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('[GET /api/semana] Error interno', error);
    const message = error instanceof Error ? error.message : 'Error al obtener las tareas semanales.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyRole(['admin', 'trabajador']);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as SemanaTareaBody;
    const { semanaKey, dia, hora, descripcion } = body;

    if (!semanaKey || !dia || !hora || !descripcion?.trim()) {
      return NextResponse.json({ error: 'Semana, día, hora y descripción son obligatorios.' }, { status: 400 });
    }

    const supabase = await createClient();
    const perfil = auth.profile as Profile;
    const usuarioNombre = perfil.nombre_completo || auth.user.email || 'Sin nombre';

    const newTask = {
      semana_key: semanaKey,
      dia,
      hora,
      descripcion: descripcion.trim(),
      usuario_id: auth.user.id,
      usuario_nombre: usuarioNombre,
      completado: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('tareas_semana').insert([newTask]).select();

    if (error) throw error;

    return NextResponse.json(data?.[0] || newTask, { status: 201 });
  } catch (error) {
    console.error('[POST /api/semana] Error interno', error);
    const message = error instanceof Error ? error.message : 'Error al guardar la tarea semanal.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRole(['admin', 'trabajador']);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as SemanaTareaBody;
    const { id, completado, descripcion, dia, hora } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la tarea.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof completado === 'boolean') updateData.completado = completado;
    if (typeof descripcion === 'string') updateData.descripcion = descripcion.trim();
    if (typeof dia === 'string') updateData.dia = dia;
    if (typeof hora === 'string') updateData.hora = hora;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Permitir actualizar solo la propia tarea o cualquier tarea si es admin
    const matchQuery = auth.profile.rol === 'admin'
      ? supabase.from('tareas_semana').update(updateData).eq('id', id)
      : supabase.from('tareas_semana').update(updateData).eq('id', id).eq('usuario_id', auth.user.id);

    const { data, error } = await matchQuery;
    if (error) throw error;

    return NextResponse.json(data?.[0] || null, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/semana] Error interno', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar la tarea semanal.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRole(['admin', 'trabajador']);
  if (auth.error) return auth.error;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la tarea.' }, { status: 400 });
    }

    const supabase = await createClient();

    const deleteQuery = auth.profile.rol === 'admin'
      ? supabase.from('tareas_semana').delete().eq('id', id)
      : supabase.from('tareas_semana').delete().eq('id', id).eq('usuario_id', auth.user.id);

    const { error } = await deleteQuery;
    if (error) throw error;

    return NextResponse.json({ message: 'Tarea eliminada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/semana] Error interno', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar la tarea semanal.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
