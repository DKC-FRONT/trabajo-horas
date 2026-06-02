import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin';
import { createClient as createServerClient } from '@/lib/server';

// Función para ordenar casas numéricamente (1, 2, 3... en vez de 1, 10, 100...)
function sortCasasNumerically(casas: any[]) {
  return casas.sort((a, b) => {
    const numA = parseInt(a.numero_casa, 10);
    const numB = parseInt(b.numero_casa, 10);
    const aIsNum = !isNaN(numA);
    const bIsNum = !isNaN(numB);
    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a.numero_casa.localeCompare(b.numero_casa);
  });
}

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const profileResult = await authClient
      .from('usuarios')
      .select('rol, casa_id')
      .eq('id', user.id)
      .single();

    if (profileResult.error) {
      throw profileResult.error;
    }

    const { rol, casa_id } = profileResult.data as { rol: string; casa_id: number | null };
    const supabase = createAdminClient();

    if (rol === 'residente') {
      if (!casa_id) {
        return NextResponse.json({ error: 'No tienes una casa asignada.' }, { status: 404 });
      }
      const { data, error } = await supabase
        .from('casas')
        .select('*')
        .eq('id', casa_id);

      if (error) throw error;
      const sorted = sortCasasNumerically(data || []);
      return NextResponse.json(sorted, { status: 200 });
    }

    const { data, error } = await supabase
      .from('casas')
      .select('*');

    if (error) throw error;

    const sorted = sortCasasNumerically(data || []);
    return NextResponse.json(sorted, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/actualizacion-datos]', error);
    return NextResponse.json({ error: 'Error al obtener datos: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const profileResult = await authClient
      .from('usuarios')
      .select('rol, casa_id')
      .eq('id', user.id)
      .single();

    if (profileResult.error) {
      throw profileResult.error;
    }

    const { rol, casa_id: userCasaId } = profileResult.data as { rol: string; casa_id: number | null };
    const supabase = createAdminClient();
    const body = await req.json();
    const {
      casa_id,
      nombre_propietario,
      tipo_propiedad,
      es_arrendatario,
      nombre_arrendatario,
      celular,
      correo,
    } = body;

    if (!casa_id) {
      return NextResponse.json({ error: 'ID de casa requerido.' }, { status: 400 });
    }

    // Solo incluir campos que realmente se envían
    const updateData: Record<string, any> = {};

    if (nombre_propietario !== undefined) updateData.nombre_propietario = nombre_propietario.trim() || null;
    if (tipo_propiedad !== undefined) updateData.tipo_propiedad = tipo_propiedad || null;
    if (es_arrendatario !== undefined) updateData.es_arrendatario = es_arrendatario;
    if (nombre_arrendatario !== undefined) updateData.nombre_arrendatario = nombre_arrendatario.trim() || null;
    if (celular !== undefined) updateData.celular = celular.trim() || null;
    if (correo !== undefined) updateData.correo = correo.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'Sin cambios para actualizar.' }, { status: 200 });
    }

    const casaId = Number(casa_id);
    if (!Number.isInteger(casaId)) {
      return NextResponse.json({ error: 'ID de casa inválido.' }, { status: 400 });
    }

    if (rol === 'residente' && userCasaId !== casaId) {
      return NextResponse.json({ error: 'No puedes actualizar los datos de otra casa.' }, { status: 403 });
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('casas')
      .update(updateData)
      .eq('id', casaId)
      .select();

    if (updateError) {
      // Si es error de columna faltante, dar mensaje claro
      if (updateError.message?.includes('column') || updateError.message?.includes('schema cache')) {
        const missingCol = updateError.message.match(/'([^']+)'/)?.[1] || 'desconocida';
        return NextResponse.json({ 
          error: `La columna '${missingCol}' no existe en la tabla 'casas'. Ejecuta el SQL de migración en Supabase para agregar las columnas necesarias.`,
          sql_hint: `ALTER TABLE casas ADD COLUMN IF NOT EXISTS nombre_propietario TEXT;\nALTER TABLE casas ADD COLUMN IF NOT EXISTS tipo_propiedad TEXT;\nALTER TABLE casas ADD COLUMN IF NOT EXISTS es_arrendatario BOOLEAN DEFAULT false;\nALTER TABLE casas ADD COLUMN IF NOT EXISTS nombre_arrendatario TEXT;\nALTER TABLE casas ADD COLUMN IF NOT EXISTS celular TEXT;\nALTER TABLE casas ADD COLUMN IF NOT EXISTS correo TEXT;`
        }, { status: 400 });
      }
      throw updateError;
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'No se encontró la casa para actualizar. Verifica el ID seleccionado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Datos actualizados correctamente.', updated: updatedRows[0] }, { status: 200 });
  } catch (error: any) {
    console.error('[PUT /api/actualizacion-datos]', error);
    return NextResponse.json({ error: 'Error al actualizar: ' + error.message }, { status: 500 });
  }
}

