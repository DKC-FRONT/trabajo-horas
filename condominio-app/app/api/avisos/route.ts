import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

// ── GET — Obtener todos los avisos ──────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('avisos')
      .select('id, titulo, mensaje, tipo, fecha')
      .order('fecha', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/avisos]', error);
    return NextResponse.json({ error: 'Error al obtener avisos.' }, { status: 500 });
  }
}

// ── POST — Publicar nuevo aviso ────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { titulo, mensaje, tipo } = await req.json();

    if (!titulo || !mensaje) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos.' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('avisos')
      .insert([{ titulo: titulo.trim(), mensaje: mensaje.trim(), tipo: tipo || 'general' }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: 'Aviso publicado correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/avisos]', error);
    return NextResponse.json({ error: 'Error al publicar aviso.' }, { status: 500 });
  }
}

// ── DELETE — Eliminar aviso ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('avisos')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Aviso eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/avisos]', error);
    return NextResponse.json({ error: 'Error al eliminar el aviso.' }, { status: 500 });
  }
}

// ── PUT — Actualizar aviso ───────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id, titulo, mensaje, tipo } = await req.json();

    if (!id || !titulo || !mensaje) {
      return NextResponse.json({ error: 'ID, Título y mensaje son requeridos.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('avisos')
      .update({ titulo: titulo.trim(), mensaje: mensaje.trim(), tipo: tipo || 'general' })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Aviso actualizado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/avisos]', error);
    return NextResponse.json({ error: 'Error al actualizar aviso.' }, { status: 500 });
  }
}
