import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { calcularLectura } from '@/lib/calcularLectura';
import { verifyRole } from '@/lib/verifyRole';
import { handleAPIError } from '@/lib/security';
import { addSecurityHeaders, addCORSHeaders } from '@/lib/cors';

// ── POST — Guardar nueva lectura ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN Y TRABAJADOR
    const auth = await verifyRole(['admin', 'trabajador']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const body = await req.json();
    const { casa_id, lectura_anterior, lectura_actual, fecha } = body;

    if (!casa_id || lectura_anterior === undefined || lectura_actual === undefined || !fecha) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos.', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const anterior = parseFloat(lectura_anterior);
    const actual = parseFloat(lectura_actual);

    if (isNaN(anterior) || isNaN(actual) || anterior < 0 || actual < 0) {
      return NextResponse.json(
        { error: 'Las lecturas deben ser números válidos.', code: 'INVALID_LECTURA' },
        { status: 400 }
      );
    }

    if (actual < anterior) {
      return NextResponse.json(
        { error: 'La lectura actual no puede ser menor que la anterior.', code: 'LECTURA_DECREASE' },
        { status: 400 }
      );
    }

    const { consumo, consumo_cobrar, valor } = calcularLectura(anterior, actual);

    const { error: insertError } = await supabase
      .from('lecturas_agua')
      .insert([{
        casa_id: Number(casa_id),
        lectura_anterior: anterior,
        lectura_actual: actual,
        consumo_cobrar,
        valor,
        fecha
      }]);

    if (insertError) throw insertError;

    const response = NextResponse.json(
      { message: 'Lectura guardada correctamente.', consumo, consumo_cobrar, valor },
      { status: 201 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));

  } catch (error) {
    return handleAPIError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    // ✅ VERIFICACIÓN DE AUTENTICACIÓN
    const auth = await verifyRole(['admin', 'trabajador', 'residente']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const mes  = Number(searchParams.get('mes') || '');
    const anio = Number(searchParams.get('anio') || '');
    const casa_id = searchParams.get('casa_id') ? Number(searchParams.get('casa_id')) : null;

    // ✅ VALIDAR PARÁMETROS
    if (mes && (mes < 1 || mes > 12)) {
      return NextResponse.json(
        { error: 'Mes debe estar entre 1 y 12.', code: 'INVALID_MES' },
        { status: 400 }
      );
    }

    if (anio && (anio < 2000 || anio > 2100)) {
      return NextResponse.json(
        { error: 'Año debe estar entre 2000 y 2100.', code: 'INVALID_ANIO' },
        { status: 400 }
      );
    }

    // ✅ VERIFICAR PROPIEDAD: Residentes solo pueden ver su propia casa
    if (auth.profile.rol === 'residente' && casa_id && casa_id !== auth.profile.casa_id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver lecturas de otras casas.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

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
        casa_id,
        casas (numero_casa)
      `);

    // ✅ RESIDENTES SOLO VEN SU CASA
    if (auth.profile.rol === 'residente') {
      query = query.eq('casa_id', auth.profile.casa_id);
    } else if (casa_id) {
      // Admin y trabajadores pueden filtrar por casa_id
      query = query.eq('casa_id', casa_id);
    }

    if (mes) query = query.eq('mes', mes);
    if (anio) query = query.eq('anio', anio);

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) throw error;

    const formattedData = data.map((item: any) => ({
      id: item.id,
      lectura_anterior: item.lectura_anterior,
      lectura_actual: item.lectura_actual,
      consumo: item.consumo,
      consumo_cobrar: item.consumo_cobrar,
      valor: item.valor,
      fecha: item.fecha,
      mes: item.mes,
      anio: item.anio,
      casa_id: item.casa_id,
      numero_casa: item.casas?.numero_casa
    }));

    const response = NextResponse.json(formattedData, { status: 200 });
    return addSecurityHeaders(addCORSHeaders(response, req));

  } catch (error) {
    return handleAPIError(error);
  }
}

// ── DELETE — Eliminar lectura por ID ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    // ✅ SOLO ADMIN
    const auth = await verifyRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'ID inválido.', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('lecturas_agua')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    const response = NextResponse.json(
      { message: 'Lectura eliminada correctamente.' },
      { status: 200 }
    );
    return addSecurityHeaders(addCORSHeaders(response, req));

  } catch (error) {
    return handleAPIError(error);
  }
}