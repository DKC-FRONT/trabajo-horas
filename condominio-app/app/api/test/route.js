import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM casas');
    return Response.json(rows);
  } catch (error) {
    return Response.json({ error: error.message });
  }
}