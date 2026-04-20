import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const mes  = Number(searchParams.get('mes')  ?? now.getMonth() + 1);
    const anio = Number(searchParams.get('anio') ?? now.getFullYear());

    // 1. Obtener consumos por casa en el mes
    const { data: rawPorCasa, error: err1 } = await supabase
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

    if (err1) throw err1;

    // Adaptar formato para compatibilidad con el frontend
    const porCasa = (rawPorCasa || []).map((r: any) => ({
      ...r,
      numero_casa: r.casas?.numero_casa
    })).sort((a: any, b: any) => parseInt(a.numero_casa) - parseInt(b.numero_casa));

    // 2. Casas que superaron 60m³
    const excedidas = porCasa.filter((r: any) => Number(r.consumo_cobrar) > 0);

    // 3. Totales
    const totalValor   = porCasa.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const totalConsumo = porCasa.reduce((s: number, r: any) => s + Number(r.consumo), 0);

    // 4. Comparativo últimos 6 meses (Uso rpc o consulta agrupada si fuera posible, por ahora simple select)
    // Para simplificar, obtenemos los datos de los últimos meses
    const { data: rawComp, error: err2 } = await supabase
      .from('lecturas_agua')
      .select('mes, anio, consumo, consumo_cobrar, valor')
      .or(`and(anio.eq.${anio},mes.lte.${mes}),and(anio.eq.${anio - 1},mes.gt.${mes})`)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (err2) throw err2;

    // Agrupar manualmente en JS para el comparativo (similar a GROUP BY)
    const agrupado: Record<string, any> = {};
    (rawComp || []).forEach((r: any) => {
      const key = `${r.anio}-${r.mes}`;
      if (!agrupado[key]) {
        agrupado[key] = { mes: r.mes, anio: r.anio, total_casas: 0, consumo_total: 0, valor_total: 0, casas_excedidas: 0 };
      }
      agrupado[key].total_casas += 1;
      agrupado[key].consumo_total += Number(r.consumo);
      agrupado[key].valor_total += Number(r.valor);
      if (Number(r.consumo_cobrar) > 0) agrupado[key].casas_excedidas += 1;
    });

    const comparativo = Object.values(agrupado).slice(0, 6).reverse();

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
      comparativo,
    }, { status: 200 });

  } catch (error) {
    console.error('[GET /api/reportes]', error);
    return NextResponse.json({ error: 'Error al generar el reporte.' }, { status: 500 });
  }
}