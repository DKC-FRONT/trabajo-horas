import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { verifyRole } from '@/lib/verifyRole';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const casa_id = searchParams.get('casa_id');

    let query = supabase
      .from('reservas')
      .select(`
        id, 
        casa_id, 
        area, 
        fecha, 
        hora_inicio, 
        hora_fin, 
        estado, 
        valor,
        casas (numero_casa)
      `);

    if (casa_id) {
      query = query.eq('casa_id', Number(casa_id));
    }

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      ...item,
      fecha_reserva: item.fecha,
      numero_casa: item.casas?.numero_casa
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error('[GET /api/reservas]', error);
    return NextResponse.json({ error: 'Error al obtener reservas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { casa_id, area, fecha_reserva, hora_inicio, hora_fin, valor } = await req.json();

    if (!casa_id || !area || !fecha_reserva || !hora_inicio || !hora_fin || valor === undefined) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
    }

    // Verificar superposición de horarios en Postgres
    const { data: existing } = await supabase
      .from('reservas')
      .select('id')
      .eq('area', area)
      .eq('fecha', fecha_reserva)
      .neq('estado', 'rechazada')
      .or(`and(hora_inicio.lte.${hora_inicio},hora_fin.gt.${hora_inicio}),and(hora_inicio.lt.${hora_fin},hora_fin.gte.${hora_fin})`);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `El área "${area}" ya está reservada en ese horario. Por favor elige otro horario o fecha.` },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase
      .from('reservas')
      .insert([{
        casa_id,
        area,
        fecha: fecha_reserva,
        hora_inicio,
        hora_fin,
        estado: 'pendiente',
        valor
      }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: 'Reserva solicitada correctamente.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/reservas]', error);
    return NextResponse.json({ error: 'Error al solicitar reserva.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { id, estado } = await req.json();

    if (!id || !estado) {
      return NextResponse.json({ error: 'ID y estado son requeridos.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('reservas')
      .update({ estado })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Estado actualizado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/reservas]', error);
    return NextResponse.json({ error: 'Error al actualizar reserva.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyRole(['admin']);
  if (auth.error) return auth.error;

  try {
    const supabase = await createClient();
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const { error: deleteError } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Reserva eliminada.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/reservas]', error);
    return NextResponse.json({ error: 'Error al eliminar reserva.' }, { status: 500 });
  }
}
