import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [rows] = await pool.query<any[]>(`
      SELECT 
        l.id,
        c.numero_casa,
        l.lectura_anterior,
        l.lectura_actual,
        l.consumo,
        l.consumo_cobrar,
        l.valor,
        l.fecha
      FROM lecturas_agua l
      JOIN casas c ON l.casa_id = c.id
      ORDER BY l.fecha DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lecturas');

    worksheet.columns = [
      { header: 'Casa',     key: 'numero_casa',      width: 10 },
      { header: 'Anterior', key: 'lectura_anterior',  width: 15 },
      { header: 'Actual',   key: 'lectura_actual',    width: 15 },
      { header: 'Consumo',  key: 'consumo',           width: 12 },
      { header: 'Exceso',   key: 'consumo_cobrar',    width: 12 },
      { header: 'Valor',    key: 'valor',             width: 15 },
      { header: 'Fecha',    key: 'fecha',             width: 15 },
    ];

    (rows as any[]).forEach((row) => {
      worksheet.addRow({
        ...row,
        fecha: new Date(row.fecha).toLocaleDateString('es-CO'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=lecturas.xlsx',
      },
    });

  } catch (error) {
    console.error('[GET /api/excel]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar Excel.' },
      { status: 500 }
    );
  }
}