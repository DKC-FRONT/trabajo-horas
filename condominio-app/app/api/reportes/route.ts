import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const mes  = Number(searchParams.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(searchParams.get('anio') ?? now.getFullYear());

    // ── Consumo por casa en el mes ──────────────────────────────
    const [porCasa] = await pool.query<any[]>(`
      SELECT
        c.numero_casa,
        l.lectura_anterior,
        l.lectura_actual,
        l.consumo,
        l.consumo_cobrar,
        l.valor,
        l.fecha
      FROM lecturas_agua l
      JOIN casas c ON l.casa_id = c.id
      WHERE l.mes = ? AND l.anio = ?
      ORDER BY CAST(c.numero_casa AS UNSIGNED) ASC
    `, [mes, anio]);

    // ── Casas que superaron 60m³ ────────────────────────────────
    const excedidas = porCasa.filter((r) => Number(r.consumo_cobrar) > 0);

    // ── Total recaudado ─────────────────────────────────────────
    const totalValor   = porCasa.reduce((s, r) => s + Number(r.valor), 0);
    const totalConsumo = porCasa.reduce((s, r) => s + Number(r.consumo), 0);

    // ── Comparativo últimos 6 meses ─────────────────────────────
    const [comparativo] = await pool.query<any[]>(`
      SELECT
        mes,
        anio,
        COUNT(*) as total_casas,
        SUM(consumo) as consumo_total,
        SUM(valor) as valor_total,
        COUNT(CASE WHEN consumo_cobrar > 0 THEN 1 END) as casas_excedidas
      FROM lecturas_agua
      WHERE (anio = ? AND mes <= ?)
         OR (anio = ? AND mes > ?)
      GROUP BY anio, mes
      ORDER BY anio DESC, mes DESC
      LIMIT 6
    `, [anio, mes, anio - 1, mes]);

    return NextResponse.json({
      mes,
      anio,
      porCasa,
      excedidas,
      resumen: {
        total_casas:     porCasa.length,
        casas_excedidas: excedidas.length,
        consumo_total:   Math.round(totalConsumo),
        valor_total:     Math.round(totalValor),
      },
      comparativo: comparativo.reverse(),
    }, { status: 200 });

  } catch (error) {
    console.error('[GET /api/reportes]', error);
    return NextResponse.json({ error: 'Error al generar el reporte.' }, { status: 500 });
  }
}