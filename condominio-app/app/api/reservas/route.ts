import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { verifyRole } from '@/lib/verifyRole';
import { handleAPIError } from '@/lib/security';
import { addSecurityHeaders, addCORSHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  try {
    // ✅ VERIFICACIÓN DE AUTENTICACIÓN
    const auth = await verifyRole(['admin', 'trabajador', 'residente']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const casa_id = searchParams.get('casa_id') ? Number(searchParams.get('casa_id')) : null;

    // ✅ VERIFICAR PROPIEDAD: Residentes solo ven sus reservas
    if (auth.profile.rol === 'residente' && casa_id && casa_id !== auth.profile.casa_id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver reservas de otras casas.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

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
        creado_el,
        casas (numero_casa)
      `);

    // ✅ RESIDENTES SOLO VEN SUS RESERVAS
    if (auth.profile.rol === 'residente') {
      query = query.eq('casa_id', auth.profile.casa_id);
    } else if (casa_id) {
      // Admin y trabajadores pueden filtrar por casa_id
      query = query.eq('casa_id', casa_id);
    }

    const { data, error } = await query
      .order('creado_el', { ascending: false })
      .order('fecha', { ascending: false });

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      id: item.id,
      casa_id: item.casa_id,
      area: item.area,
      fecha: item.fecha,
      fecha_reserva: item.fecha,
      hora_inicio: item.hora_inicio,
      hora_fin: item.hora_fin,
      estado: item.estado,
      valor: item.valor,
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
    // ✅ VERIFICACIÓN DE AUTENTICACIÓN
    const auth = await verifyRole(['admin', 'trabajador', 'residente']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { casa_id, area, fecha_reserva, hora_inicio, hora_fin, valor } = await req.json();

    if (!casa_id || !area || !fecha_reserva || !hora_inicio || !hora_fin || valor === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // ✅ VALIDAR QUE EL USUARIO TIENE PERMISO PARA ESTA CASA
    // Residentes solo pueden crear reservas en su propia casa
    if (auth.profile.rol === 'residente' && Number(casa_id) !== auth.profile.casa_id) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear reservas en otra casa.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const parseDateTime = (dateStr: string, timeStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    };

    const buildInterval = (dateStr: string, startTime: string, endTime: string) => {
      const start = parseDateTime(dateStr, startTime);
      const end = parseDateTime(dateStr, endTime);
      if (end <= start) {
        end.setUTCDate(end.getUTCDate() + 1);
      }
      return { start, end };
    };

    const parseTimeParts = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length !== 2 || !Number.isInteger(parts[0]) || !Number.isInteger(parts[1])) {
        return null;
      }
      const [hours, minutes] = parts;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
      }
      return { hours, minutes };
    };

    const horaInicioParts = parseTimeParts(hora_inicio);
    const horaFinParts = parseTimeParts(hora_fin);
    if (!horaInicioParts || !horaFinParts) {
      return NextResponse.json({ error: 'Formato de hora inválido.' }, { status: 400 });
    }

    const newInterval = buildInterval(fecha_reserva, hora_inicio, hora_fin);
    const datesToCheck = [fecha_reserva];
    if (newInterval.end.getUTCDate() !== newInterval.start.getUTCDate()) {
      const nextDate = new Date(newInterval.start);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      datesToCheck.push(nextDate.toISOString().split('T')[0]);
    }

    const { data: existing } = await supabase
      .from('reservas')
      .select('id, fecha, hora_inicio, hora_fin')
      .eq('area', area)
      .neq('estado', 'rechazada')
      .in('fecha', datesToCheck);

    if (existing && existing.length > 0) {
      const overlap = (existing as any[]).some((item) => {
        const existingInterval = buildInterval(item.fecha, item.hora_inicio, item.hora_fin);
        return newInterval.start < existingInterval.end && existingInterval.start < newInterval.end;
      });

      if (overlap) {
        return NextResponse.json(
          { error: `El área "${area}" ya está reservada en ese horario. Por favor elige otro horario o fecha.` },
          { status: 409 }
        );
      }
    }

    const { error: insertError } = await supabase
      .from('reservas')
      .insert([{
        casa_id: Number(casa_id),
        area: String(area).trim(),
        fecha: fecha_reserva,
        hora_inicio,
        hora_fin,
        estado: 'pendiente',
        valor: Number(valor)
      }]);

    if (insertError) throw insertError;

    const response = NextResponse.json(
      { message: 'Reserva solicitada correctamente.' },
      { status: 201 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error: any) {
    return handleAPIError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { id, estado } = await req.json();

    if (!id || !estado) {
      return NextResponse.json(
        { error: 'ID y estado son requeridos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const allowedStates = ['pendiente', 'aprobada', 'rechazada'];
    if (!allowedStates.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido.', code: 'INVALID_ESTADO' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('reservas')
      .update({ estado })
      .eq('id', id);

    if (updateError) throw updateError;

    const response = NextResponse.json(
      { message: 'Estado actualizado correctamente.' },
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
      .from('reservas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    const response = NextResponse.json(
      { message: 'Reserva eliminada.' },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));
  } catch (error) {
    return handleAPIError(error);
  }
}
