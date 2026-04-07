import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// ── GET — Obtener todos los avisos ──────────────────────────────────────────
export async function GET() {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, titulo, mensaje, tipo, fecha FROM avisos ORDER BY fecha DESC'
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/avisos]', error);
    return NextResponse.json({ error: 'Error al obtener avisos.' }, { status: 500 });
  }
}

// ── POST — Publicar nuevo aviso (Solo admin idealmente) ────────────────────
export async function POST(req: NextRequest) {
  try {
    const { titulo, mensaje, tipo } = await req.json();

    if (!titulo || !mensaje) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos.' }, { status: 400 });
    }

    const t = tipo || 'general';

    await pool.query(
      'INSERT INTO avisos (titulo, mensaje, tipo) VALUES (?, ?, ?)',
      [titulo.trim(), mensaje.trim(), t]
    );

    return NextResponse.json({ message: 'Aviso publicado correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/avisos]', error);
    return NextResponse.json({ error: 'Error al publicar aviso.' }, { status: 500 });
  }
}

// ── DELETE — Eliminar aviso ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      'DELETE FROM avisos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Aviso no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Aviso eliminado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/avisos]', error);
    return NextResponse.json({ error: 'Error al eliminar el aviso.' }, { status: 500 });
  }
}
