import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now  = new Date();
    const mes  = Number(searchParams.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(searchParams.get('anio') ?? now.getFullYear());

    const [rows] = await pool.query<any[]>(`
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

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Condominio La Florida';
    const worksheet = workbook.addWorksheet(`${MESES[mes - 1]} ${anio}`);

    // ── Título ──────────────────────────────────────────────────
    worksheet.mergeCells('A1:G1');
    const title = worksheet.getCell('A1');
    title.value = `Condominio Campestre La Florida — Reporte ${MESES[mes - 1]} ${anio}`;
    title.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    title.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells('A2:G2');
    const sub = worksheet.getCell('A2');
    sub.value = `Generado el ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    sub.font  = { italic: true, size: 10, color: { argb: 'FF666666' } };
    sub.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 18;

    // ── Headers ─────────────────────────────────────────────────
    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Casa', 'Lect. Anterior', 'Lect. Actual', 'Consumo (m³)', 'Exceso (m³)', 'Valor ($)', 'Fecha'];
    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 22;

    worksheet.columns = [
      { key: 'numero_casa',      width: 10 },
      { key: 'lectura_anterior', width: 16 },
      { key: 'lectura_actual',   width: 14 },
      { key: 'consumo',          width: 14 },
      { key: 'consumo_cobrar',   width: 14 },
      { key: 'valor',            width: 16 },
      { key: 'fecha',            width: 16 },
    ];

    // ── Datos ────────────────────────────────────────────────────
    rows.forEach((row, i) => {
      const dr = worksheet.addRow({
        numero_casa:      `Casa ${row.numero_casa}`,
        lectura_anterior: Math.round(row.lectura_anterior),
        lectura_actual:   Math.round(row.lectura_actual),
        consumo:          Math.round(row.consumo),
        consumo_cobrar:   Math.round(row.consumo_cobrar),
        valor:            Math.round(row.valor),
        fecha:            new Date(row.fecha).toLocaleDateString('es-CO'),
      });

      const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF0F4FF';
      dr.eachCell((cell) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { horizontal: 'center' };
        cell.font      = { size: 10 };
      });

      if (Number(row.consumo_cobrar) > 0) {
        dr.getCell('consumo_cobrar').font = { bold: true, color: { argb: 'FFDC2626' }, size: 10 };
        dr.getCell('valor').font         = { bold: true, color: { argb: 'FF16A34A' }, size: 10 };
      }
      dr.height = 18;
    });

    // ── Fila totales ─────────────────────────────────────────────
    const totals = worksheet.addRow({
      numero_casa:      'TOTAL',
      lectura_anterior: '',
      lectura_actual:   '',
      consumo:          rows.reduce((s: number, r: any) => s + Math.round(r.consumo), 0),
      consumo_cobrar:   rows.reduce((s: number, r: any) => s + Math.round(r.consumo_cobrar), 0),
      valor:            rows.reduce((s: number, r: any) => s + Math.round(r.valor), 0),
      fecha:            '',
    });
    totals.eachCell((cell) => {
      cell.font      = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center' };
    });
    totals.height = 20;

    // ── Resumen casas excedidas ──────────────────────────────────
    worksheet.addRow([]);
    const excRow = worksheet.addRow(['Casas que superaron 60m³:',
      rows.filter((r: any) => r.consumo_cobrar > 0).map((r: any) => `Casa ${r.numero_casa}`).join(', ') || 'Ninguna'
    ]);
    worksheet.mergeCells(`B${excRow.number}:G${excRow.number}`);
    excRow.getCell(1).font = { bold: true, size: 10 };
    excRow.getCell(2).font = { color: { argb: 'FFDC2626' }, size: 10 };

    const buffer = await workbook.xlsx.writeBuffer();
    const fecha  = `${anio}-${String(mes).padStart(2, '0')}`;

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=reporte_${fecha}.xlsx`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('[GET /api/reportes/excel]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar Excel.' },
      { status: 500 }
    );
  }
}