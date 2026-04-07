import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query<any[]>(`
      SELECT u.id, u.nombre, u.correo, u.rol, u.casa_id, c.numero_casa 
      FROM usuarios u
      LEFT JOIN casas c ON u.casa_id = c.id
      ORDER BY u.created_at DESC
    `);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('[GET /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al obtener usuarios.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, correo, password, rol, casa_id } = await req.json();

    if (!nombre || !correo || !password || !rol) {
      return NextResponse.json({ error: 'Todos los campos excepto la casa son requeridos.' }, { status: 400 });
    }

    const [existing] = await pool.query<any[]>(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'El correo ya está en uso.' }, { status: 409 });
    }

    const cid = casa_id ? Number(casa_id) : null;

    await pool.query(
      'INSERT INTO usuarios (nombre, correo, password, rol, casa_id) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), correo.trim(), password, rol, cid]
    );

    return NextResponse.json({ message: 'Usuario creado correctamente.' }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, nombre, correo, rol, casa_id, password } = await req.json();

    if (!id || !nombre || !correo || !rol) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const [existing] = await pool.query<any[]>(
      'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
      [correo, id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'El correo ya está en uso por otro usuario.' }, { status: 409 });
    }

    const cid = casa_id ? Number(casa_id) : null;

    if (password && password.trim() !== '') {
      await pool.query(
        'UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, casa_id = ?, password = ? WHERE id = ?',
        [nombre.trim(), correo.trim(), rol, cid, password, id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, casa_id = ? WHERE id = ?',
        [nombre.trim(), correo.trim(), rol, cid, id]
      );
    }

    return NextResponse.json({ message: 'Usuario actualizado correctamente.' }, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al actualizar el usuario.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Usuario eliminado.' }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/usuarios]', error);
    return NextResponse.json({ error: 'Error al eliminar usuario.' }, { status: 500 });
  }
}
