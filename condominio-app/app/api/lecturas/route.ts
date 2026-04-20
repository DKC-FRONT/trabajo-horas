import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { calcularLectura } from '@/lib/calcularLectura';

// ── POST — Guardar nueva lectura ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { casa_id, lectura_anterior, lectura_actual, fecha } = body;

    // Validaciones
    if (!casa_id || !lectura_anterior || !lectura_actual || !fecha) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos.' },
        { status: 400 }
      );
    }

    const anterior = parseFloat(lectura_anterior);
    const actual   = parseFloat(lectura_actual);

    if (isNaN(anterior) || isNaN(actual)) {
      return NextResponse.json(
        { error: 'Las lecturas deben ser números válidos.' },
        { status: 400 }
      );
    }

    if (actual < anterior) {
      return NextResponse.json(
        { error: 'La lectura actual no puede ser menor que la anterior.' },
        { status: 400 }
      );
    }

    // Cálculos centralizados desde lib/calcularLectura.ts
    const { consumo, consumo_cobrar, valor } = calcularLectura(anterior, actual);

    const { error: insertError } = await supabase
      .from('lecturas_agua')
      .insert([{ 
        casa_id, 
        lectura_anterior: anterior, 
        lectura_actual: actual, 
        consumo_cobrar, 
        valor, 
        fecha
      }]);

    if (insertError) throw insertError;

    return NextResponse.json(
      { message: 'Lectura guardada correctamente.', consumo, consumo_cobrar, valor },
      { status: 201 }
    );

  } catch (error) {
    console.error('[POST /api/lecturas]', error);
    return NextResponse.json(
      { error: 'Error al guardar la lectura.' },
      { status: 500 }
    );
  }
}

// ── GET — Listar lecturas ────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const mes  = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const casa_id = searchParams.get('casa_id');

    let query = supabase
      .from('lecturas_agua')
      .select(`
        id,
        lectura_anterior,
        lectura_actual,
        consumo,
        consumo_cobrar,
        valor,
        fecha,
        mes,
        anio,
        casas (numero_casa)
      `);

    if (mes) query = query.eq('mes', Number(mes));
    if (anio) query = query.eq('anio', Number(anio));
    if (casa_id) query = query.eq('casa_id', Number(casa_id));

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) throw error;

    // Aplanar resultado
    const formattedData = data.map((item: any) => ({
      ...item,
      numero_casa: item.casas?.numero_casa
    }));

    return NextResponse.json(formattedData, { status: 200 });

  } catch (error) {
    console.error('[GET /api/lecturas]', error);
    return NextResponse.json(
      { error: 'Error al obtener las lecturas.' },
      { status: 500 }
    );
  }
}

// ── DELETE — Eliminar lectura por ID ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'ID inválido.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('lecturas_agua')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json(
      { message: 'Lectura eliminada correctamente.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DELETE /api/lecturas]', error);
    return NextResponse.json(
      { error: 'Error al eliminar la lectura.' },
      { status: 500 }
    );
  }
}