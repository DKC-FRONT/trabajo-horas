import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── GET — Listar todas las casas ────────────────────────────────────────────
export async function GET() {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, numero_casa FROM casas ORDER BY CAST(numero_casa AS UNSIGNED) ASC'
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/casas]', error);
    return NextResponse.json({ error: 'Error al obtener las casas.' }, { status: 500 });
  }
}

// ── POST — Agregar casa nueva ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { numero_casa } = await req.json();

    if (!numero_casa || String(numero_casa).trim() === '') {
      return NextResponse.json({ error: 'El número de casa es requerido.' }, { status: 400 });
    }

    // Verificar duplicado
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM casas WHERE numero_casa = ?',
      [String(numero_casa).trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: `La casa ${numero_casa} ya existe.` }, { status: 409 });
    }

    await pool.query(
      'INSERT INTO casas (numero_casa) VALUES (?)',
      [String(numero_casa).trim()]
    );

    return NextResponse.json({ message: 'Casa agregada correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/casas]', error);
    return NextResponse.json({ error: 'Error al agregar la casa.' }, { status: 500 });
  }
}

// ── PUT — Editar número de casa ─────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const { id, numero_casa } = await req.json();

    if (!id || !numero_casa || String(numero_casa).trim() === '') {
      return NextResponse.json({ error: 'ID y número de casa son requeridos.' }, { status: 400 });
    }

    // Verificar duplicado excluyendo la misma casa
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM casas WHERE numero_casa = ? AND id != ?',
      [String(numero_casa).trim(), id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: `La casa ${numero_casa} ya existe.` }, { status: 409 });
    }

    const [result]: any = await pool.query(
      'UPDATE casas SET numero_casa = ? WHERE id = ?',
      [String(numero_casa).trim(), id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Casa no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Casa actualizada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/casas]', error);
    return NextResponse.json({ error: 'Error al actualizar la casa.' }, { status: 500 });
  }
}

// ── DELETE — Eliminar casa ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    // Verificar si tiene lecturas asociadas
    const [lecturas] = await pool.query<any[]>(
      'SELECT id FROM lecturas_agua WHERE casa_id = ? LIMIT 1',
      [id]
    );

    if (lecturas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: la casa tiene lecturas registradas.' },
        { status: 409 }
      );
    }

    const [result]: any = await pool.query(
      'DELETE FROM casas WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Casa no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Casa eliminada correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/casas]', error);
    return NextResponse.json({ error: 'Error al eliminar la casa.' }, { status: 500 });
  }
}