import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const now  = new Date();
    const mes  = Number(searchParams.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(searchParams.get('anio') ?? now.getFullYear());

    const { data: rows, error: dbError } = await supabase
      .from('lecturas_agua')
      .select(`
        id,
        lectura_anterior,
        lectura_actual,
        consumo,
        consumo_cobrar,
        valor,
        fecha,
        casas (numero_casa)
      `)
      .eq('mes', mes)
      .eq('anio', anio);

    if (dbError) throw dbError;

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Condominio La Florida';
    const worksheet = workbook.addWorksheet(`${MESES[mes - 1]} ${anio}`);

    // ── Título ──────────────────────────────────────────────────
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Condominio Campestre La Florida — Reporte ${MESES[mes - 1]} ${anio}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 35;

    worksheet.mergeCells('A2:G2');
    const sub = worksheet.getCell('A2');
    sub.value = `Generado el ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    sub.font  = { italic: true, size: 10, color: { argb: 'FF666666' } };
    sub.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 18;

    // ── Headers ─────────────────────────────────────────────────
    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Casa', 'Lect. Anterior', 'Lect. Actual', 'Consumo (m³)', 'Exceso (m³)', 'Valor ($)', 'Fecha'];
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Bright blue
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    });

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
    (rows || []).forEach((row: any) => {
      const dr = worksheet.addRow({
        numero_casa:      `Casa ${row.casas?.numero_casa || 'N/A'}`,
        lectura_anterior: Math.round(row.lectura_anterior),
        lectura_actual:   Math.round(row.lectura_actual),
        consumo:          Math.round(row.consumo),
        consumo_cobrar:   Math.round(row.consumo_cobrar),
        valor:            Math.round(row.valor),
        fecha:            new Date(row.fecha).toLocaleDateString('es-CO'),
      });

      dr.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        // Reglas de color específicas
        if (colNumber === 5 && Number(row.consumo_cobrar) > 0) {
           // Exceso en rojo
           cell.font = { name: 'Arial', size: 10, color: { argb: 'FFEF4444' } };
        }
        if (colNumber === 6) {
           // Valor en verde
           cell.font = { name: 'Arial', size: 10, color: { argb: 'FF16A34A' } };
        }
      });
      dr.height = 20;
    });

    // ── Fila totales ─────────────────────────────────────────────
    const totals = worksheet.addRow({
      numero_casa:      'TOTAL',
      lectura_anterior: '',
      lectura_actual:   '',
      consumo:          (rows || []).reduce((s: number, r: any) => s + Math.round(r.consumo), 0),
      consumo_cobrar:   (rows || []).reduce((s: number, r: any) => s + Math.round(r.consumo_cobrar), 0),
      valor:            (rows || []).reduce((s: number, r: any) => s + Math.round(r.valor), 0),
      fecha:            '',
    });
    totals.height = 25;
    totals.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // ── Resumen casas excedidas ──────────────────────────────────
    worksheet.addRow([]);
    const excRow = worksheet.addRow(['Casas que superaron 60m³:',
      (rows || []).filter((r: any) => r.consumo_cobrar > 0).map((r: any) => `Casa ${r.casas?.numero_casa}`).join(', ') || 'Ninguna'
    ]);
    worksheet.mergeCells(`B${excRow.number}:G${excRow.number}`);
    excRow.getCell(1).font = { bold: true, size: 10 };
    excRow.getCell(2).font = { color: { argb: 'FFDC2626' }, size: 10 };

    const buffer = await workbook.xlsx.writeBuffer();
    const fechaDescarga  = `${anio}-${String(mes).padStart(2, '0')}`;

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=reporte_${fechaDescarga}.xlsx`,
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