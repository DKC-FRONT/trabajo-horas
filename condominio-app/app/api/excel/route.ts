import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Obtener lecturas con join a casas en español
    const { data: rows, error: dbError } = await supabase
      .from('lecturas_agua')
      .select(`
        id,
        casa_id,
        lectura_anterior,
        lectura_actual,
        consumo,
        consumo_cobrar,
        valor,
        fecha,
        casas (numero_casa)
      `)
      .order('fecha', { ascending: false });

    if (dbError) throw dbError;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Lecturas', {
      views: [{ showGridLines: false }]
    });

    const now = new Date();
    const mes = now.toLocaleDateString('es-CO', { month: 'long' });
    const ano = now.getFullYear();
    const tituloReporte = `Condominio Campestre La Florida — Reporte ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${ano}`;
    const fechaGenerado = `Generado el ${now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    // Configurar columnas Base
    worksheet.columns = [
      { key: 'casa', width: 20 },
      { key: 'anterior', width: 18 },
      { key: 'actual', width: 18 },
      { key: 'consumo', width: 18 },
      { key: 'exceso', width: 18 },
      { key: 'valor', width: 18 },
      { key: 'fecha', width: 18 },
    ];

    // Fila 1: Título Principal
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = tituloReporte;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 35;

    // Fila 2: Subtítulo de fecha
    worksheet.mergeCells('A2:G2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = fechaGenerado;
    subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 25;

    // Fila 3: Encabezados de tabla
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

    let totalConsumo = 0;
    let totalExceso = 0;
    let totalValor = 0;

    let currentRowNumber = 4;

    // Filas de datos
    (rows || []).forEach((row: any) => {
      const consumoVal = Number(row.consumo) || 0;
      const excesoVal = Number(row.consumo_cobrar) || 0;
      const valorNum = Number(row.valor) || 0;

      totalConsumo += consumoVal;
      totalExceso += excesoVal;
      totalValor += valorNum;

      const dataRow = worksheet.getRow(currentRowNumber);
      dataRow.values = [
        `Casa ${row.casas?.numero_casa || 'N/A'}`,
        row.lectura_anterior,
        row.lectura_actual,
        consumoVal,
        excesoVal,
        valorNum,
        new Date(row.fecha).toLocaleDateString('es-CO')
      ];

      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        // Reglas de color específicas
        if (colNumber === 5 && excesoVal > 0) {
           // Exceso en rojo
           cell.font = { name: 'Arial', size: 10, color: { argb: 'FFEF4444' } };
        }
        if (colNumber === 6) {
           // Valor en verde
           cell.font = { name: 'Arial', size: 10, color: { argb: 'FF16A34A' } };
        }
      });

      currentRowNumber++;
    });

    // Fila final: TOTAL
    const totalRow = worksheet.getRow(currentRowNumber);
    totalRow.values = ['TOTAL', '', '', Math.round(totalConsumo), Math.round(totalExceso), Math.round(totalValor), ''];
    totalRow.height = 25;
    totalRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=reporte_lecturas_${mes}_${ano}.xlsx`,
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
