import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ─── Nombre real de la columna de fecha en la tabla reservas ──────────────────
// Si la creaste con fecha_reserva, cambia esto a 'fecha_reserva'
const COL_FECHA = 'fecha';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const casa_id = searchParams.get('casa_id');

    let query = `
      SELECT r.id, r.casa_id, r.area,
             r.${COL_FECHA} AS fecha_reserva,
             r.hora_inicio, r.hora_fin, r.estado,
             c.numero_casa
      FROM reservas r
      JOIN casas c ON r.casa_id = c.id
    `;
    const params: any[] = [];

    if (casa_id) {
      query += ` WHERE r.casa_id = ?`;
      params.push(Number(casa_id));
    }

    query += ` ORDER BY r.${COL_FECHA} DESC, r.hora_inicio DESC`;

    const [rows] = await pool.query<any[]>(query, params);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/reservas]', error);
    return NextResponse.json({ error: 'Error al obtener reservas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { casa_id, area, fecha_reserva, hora_inicio, hora_fin } = await req.json();

    if (!casa_id || !area || !fecha_reserva || !hora_inicio || !hora_fin) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
    }

    // Verificar superposición de horarios
    const [existing] = await pool.query<any[]>(
      `SELECT id FROM reservas
       WHERE area = ? AND ${COL_FECHA} = ? AND estado != 'rechazada'
       AND (
         (hora_inicio <= ? AND hora_fin > ?) OR
         (hora_inicio < ?  AND hora_fin >= ?)
       )`,
      [area, fecha_reserva, hora_inicio, hora_inicio, hora_fin, hora_fin]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `El área "${area}" ya está reservada en ese horario. Por favor elige otro horario o fecha.` },
        { status: 409 }
      );
    }

    await pool.query(
      `INSERT INTO reservas (casa_id, area, ${COL_FECHA}, hora_inicio, hora_fin, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [casa_id, area, fecha_reserva, hora_inicio, hora_fin]
    );

    return NextResponse.json({ message: 'Reserva solicitada correctamente.' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/reservas]', error);

    // Si sigue fallando la columna, devolver mensaje útil al usuario
    if (error?.code === 'ER_BAD_FIELD_ERROR') {
      return NextResponse.json(
        { error: `Error de esquema: columna de fecha no encontrada (${error.sqlMessage}). Ejecuta el SQL de corrección en la base de datos.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Error al solicitar reserva.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, estado } = await req.json();

    if (!id || !estado) {
      return NextResponse.json({ error: 'ID y estado son requeridos.' }, { status: 400 });
    }

    const estadosValidos = ['pendiente', 'aprobada', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 });
    }

    await pool.query('UPDATE reservas SET estado = ? WHERE id = ?', [estado, id]);
    return NextResponse.json({ message: 'Estado actualizado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/reservas]', error);
    return NextResponse.json({ error: 'Error al actualizar reserva.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    await pool.query('DELETE FROM reservas WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Reserva eliminada.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/reservas]', error);
    return NextResponse.json({ error: 'Error al eliminar reserva.' }, { status: 500 });
  }
}
