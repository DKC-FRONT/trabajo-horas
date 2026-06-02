import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin';

// Función para ordenar casas numéricamente
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

// ── GET — Listar todos los cobros jurídicos ──
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const tipo = url.searchParams.get('tipo'); // 'casas' para obtener lista de casas

    if (tipo === 'casas') {
      const { data, error } = await supabase
        .from('casas')
        .select('id, numero_casa');
      if (error) throw error;
      return NextResponse.json(sortCasasNumerically(data || []), { status: 200 });
    }

    const { data, error } = await supabase
      .from('cobros_juridicos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'La tabla cobros_juridicos no existe. Debes crearla en Supabase.',
          sql_hint: `CREATE TABLE cobros_juridicos (
  id BIGSERIAL PRIMARY KEY,
  numero_casa TEXT NOT NULL,
  propietario TEXT,
  valor_mora NUMERIC(12,0) NOT NULL DEFAULT 0,
  concepto TEXT DEFAULT 'Cuota de administración',
  meses_mora TEXT,
  fecha_notificacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite DATE,
  estado TEXT NOT NULL DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
        }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/cobros-juridicos]', error);
    return NextResponse.json({ error: 'Error al obtener cobros: ' + error.message }, { status: 500 });
  }
}

// ── POST — Crear nuevo(s) cobro(s) jurídico(s) ──
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { cobros } = body; // Array de cobros

    if (!cobros || !Array.isArray(cobros) || cobros.length === 0) {
      return NextResponse.json({ error: 'Debes enviar al menos un cobro.' }, { status: 400 });
    }

    const registros = cobros.map((c: any) => ({
      numero_casa: c.numero_casa,
      propietario: c.propietario || null,
      valor_mora: c.valor_mora || 0,
      concepto: c.concepto || 'Cuota de administración',
      meses_mora: c.meses_mora || null,
      fecha_notificacion: c.fecha_notificacion || new Date().toISOString().split('T')[0],
      fecha_limite: c.fecha_limite || null,
      estado: 'activo',
      notas: c.notas || null,
    }));

    const { error } = await supabase
      .from('cobros_juridicos')
      .insert(registros);

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'La tabla cobros_juridicos no existe. Créala primero en Supabase.',
        }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ message: `${registros.length} cobro(s) registrado(s) correctamente.` }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/cobros-juridicos]', error);
    return NextResponse.json({ error: 'Error al registrar cobro: ' + error.message }, { status: 500 });
  }
}

// ── PUT — Actualizar estado de un cobro ──
export async function PUT(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, estado, notas } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cobro requerido.' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (estado !== undefined) updateData.estado = estado;
    if (notas !== undefined) updateData.notas = notas;

    const { error } = await supabase
      .from('cobros_juridicos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Cobro actualizado.' }, { status: 200 });
  } catch (error: any) {
    console.error('[PUT /api/cobros-juridicos]', error);
    return NextResponse.json({ error: 'Error al actualizar: ' + error.message }, { status: 500 });
  }
}

// ── DELETE — Eliminar un cobro ──
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cobro requerido.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cobros_juridicos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Cobro eliminado.' }, { status: 200 });
  } catch (error: any) {
    console.error('[DELETE /api/cobros-juridicos]', error);
    return NextResponse.json({ error: 'Error al eliminar: ' + error.message }, { status: 500 });
  }
}
