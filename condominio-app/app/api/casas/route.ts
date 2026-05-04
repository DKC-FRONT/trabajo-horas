import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { verifyRole } from '@/lib/verifyRole';

// ── GET — Listar todas las casas ────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('casas')
      .select('id, numero_casa')
      .order('id', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/casas]', error);
    return NextResponse.json({ error: 'Error al obtener las casas.' }, { status: 500 });
  }
}

// ── POST — Agregar casa nueva ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyRole(['admin', 'trabajador']);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { numero_casa } = await req.json();

    if (!numero_casa || String(numero_casa).trim() === '') {
      return NextResponse.json({ error: 'El número de casa es requerido.' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('casas')
      .select('id')
      .eq('numero_casa', String(numero_casa).trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `La casa ${numero_casa} ya existe.` }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from('casas')
      .insert([{ numero_casa: String(numero_casa).trim() }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: 'Casa agregada correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/casas] Error interno');
    return NextResponse.json({ error: 'Error al agregar la casa.' }, { status: 500 });
  }
}

// ── PUT — Editar número de casa ─────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const auth = await verifyRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { id, numero_casa } = await req.json();

    if (!id || !numero_casa || String(numero_casa).trim() === '') {
      return NextResponse.json({ error: 'ID y número de casa son requeridos.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('casas')
      .update({ numero_casa: String(numero_casa).trim() })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Casa actualizada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/casas] Error interno');
    return NextResponse.json({ error: 'Error al actualizar la casa.' }, { status: 500 });
  }
}

// ── DELETE — Eliminar casa ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await verifyRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { id } = await req.json();

    // Parámetros disponibles para filtrado futuro si se requiere
    // searchParams.get('mes');
    // searchParams.get('anio');

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    // Verificar si tiene lecturas asociadas (Supabase maneja esto con FK si se desea, pero hacemos el check manual sugerido)
    const { count } = await supabase
      .from('lecturas_agua')
      .select('*', { count: 'exact', head: true })
      .eq('casa_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: la casa tiene lecturas registradas.' },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from('casas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Casa eliminada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/casas] Error interno');
    return NextResponse.json({ error: 'Error al eliminar la casa.' }, { status: 500 });
  }
}