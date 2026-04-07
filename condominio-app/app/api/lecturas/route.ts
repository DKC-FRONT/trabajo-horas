import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { calcularLectura } from '@/lib/calcularLectura';

// ── POST — Guardar nueva lectura ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
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

    const fechaDate = new Date(fecha);
    const mes  = fechaDate.getMonth() + 1;
    const anio = fechaDate.getFullYear();

    await pool.query(
      `INSERT INTO lecturas_agua
        (casa_id, lectura_anterior, lectura_actual, consumo, consumo_cobrar, valor, fecha, mes, anio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [casa_id, anterior, actual, consumo, consumo_cobrar, valor, fecha, mes, anio]
    );

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

// ── GET — Listar lecturas (opcional: filtro por mes y/o año) ────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mes  = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const casa_id = searchParams.get('casa_id');

    let query = `
      SELECT
        l.id,
        l.lectura_anterior,
        l.lectura_actual,
        l.consumo,
        l.consumo_cobrar,
        l.valor,
        l.fecha,
        l.mes,
        l.anio,
        c.numero_casa
      FROM lecturas_agua l
      JOIN casas c ON l.casa_id = c.id
    `;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (mes) {
      conditions.push('l.mes = ?');
      params.push(Number(mes));
    }

    if (anio) {
      conditions.push('l.anio = ?');
      params.push(Number(anio));
    }

    if (casa_id) {
      conditions.push('l.casa_id = ?');
      params.push(Number(casa_id));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.fecha DESC';

    const [rows] = await pool.query(query, params);

    return NextResponse.json(rows, { status: 200 });

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
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'ID inválido.' },
        { status: 400 }
      );
    }

    const [result]: any = await pool.query(
      'DELETE FROM lecturas_agua WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Lectura no encontrada.' },
        { status: 404 }
      );
    }

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