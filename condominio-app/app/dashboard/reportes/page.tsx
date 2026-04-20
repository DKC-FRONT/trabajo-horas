'use client';

import { useEffect, useState } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ACCENT = '#fb923c';

type LecturaRow = {
  numero_casa: string;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;
  consumo_cobrar: number;
  valor: number;
  fecha: string;
};

type Comparativo = {
  mes: number;
  anio: number;
  total_casas: number;
  consumo_total: number;
  valor_total: number;
  casas_excedidas: number;
};

type ReporteData = {
  mes: number;
  anio: number;
  porCasa: LecturaRow[];
  excedidas: LecturaRow[];
  resumen: {
    total_casas: number;
    casas_excedidas: number;
    consumo_total: number;
    valor_total: number;
  };
  comparativo: Comparativo[];
};

export default function ReportesPage() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [data, setData]       = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [visible, setVisible] = useState(false);
  const [tab, setTab]         = useState<'resumen' | 'detalle' | 'comparativo'>('resumen');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Estados para el rango del comparativo
  const [mesInicio, setMesInicio] = useState(1);
  const [anioInicio, setAnioInicio] = useState(new Date().getFullYear());
  const [mesFin, setMesFin] = useState(new Date().getMonth() + 1);
  const [anioFin, setAnioFin] = useState(new Date().getFullYear());

  // Inicializar el rango (6 meses atrás por defecto)
  useEffect(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    setMesInicio(d.getMonth() + 1);
    setAnioInicio(d.getFullYear());
  }, []);

  /**
   * Hook inicial para cargar el reporte al montar el componente o cuando cambian los filtros.
   */
  useEffect(() => {
    fetchReporte();
    setTimeout(() => setVisible(true), 50);
  }, [mesSeleccionado, anioSeleccionado, mesInicio, anioInicio, mesFin, anioFin]);

  /**
   * Genera el reporte completo consultando Supabase y procesando los datos localmente.
   */
  const fetchReporte = async () => {
    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      // 1. Obtener todas las casas
      const { data: casasData, error: casasErr } = await supabase.from('casas').select('*');
      if (casasErr) throw casasErr;

      // 2. Obtener lecturas del mes actual seleccionado
      const inicioMes = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01`;
      
      // Cálculo dinámico del último día del mes
      const ultimoDia = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();
      const finMes = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-${ultimoDia}`;
      
      const { data: lecturasMes, error: lecturasErr } = await supabase
        .from('lecturas_agua')
        .select('*, casas(numero_casa)')
        .gte('fecha', inicioMes)
        .lte('fecha', finMes);
      if (lecturasErr) throw lecturasErr;

      // 3. Procesar datos del mes (Ordenados numéricamente)
      const porCasa: LecturaRow[] = (lecturasMes || []).map(l => ({
        // Usamos el ID de la casa si el Join falla por alguna razón
        numero_casa: l.casas?.numero_casa || `Casa ${l.casa_id}`,
        lectura_anterior: Number(l.lectura_anterior) || 0,
        lectura_actual: Number(l.lectura_actual) || 0,
        consumo: Number(l.consumo) || 0,
        consumo_cobrar: Number(l.consumo_cobrar) || 0,
        valor: Number(l.valor) || 0,
        fecha: l.fecha
      })).sort((a, b) => {
        const numA = parseInt(a.numero_casa.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.numero_casa.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const excedidas = porCasa.filter(c => c.consumo_cobrar > 0);

      const resumen = {
        total_casas: casasData?.length || 0,
        casas_excedidas: excedidas.length,
        consumo_total: porCasa.reduce((s, c) => s + c.consumo, 0),
        valor_total: porCasa.reduce((s, c) => s + c.valor, 0)
      };

      // 4. Obtener comparativo basado en el rango dinámico
      const fechaInicioComp = `${anioInicio}-${String(mesInicio).padStart(2, '0')}-01`;
      const ultimoDiaFin = new Date(anioFin, mesFin, 0).getDate();
      const fechaFinComp = `${anioFin}-${String(mesFin).padStart(2, '0')}-${ultimoDiaFin}`;
      
      const { data: lecturasHistorico } = await supabase
        .from('lecturas_agua')
        .select('*')
        .gte('fecha', fechaInicioComp)
        .lte('fecha', fechaFinComp)
        .order('fecha', { ascending: true });

      // Agrupar por mes/año para el comparativo
      const historicoMap: Record<string, Comparativo> = {};
      (lecturasHistorico || []).forEach(l => {
        const d = new Date(l.fecha + 'T12:00:00'); // Evitar problemas de zona horaria
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!historicoMap[key]) {
          historicoMap[key] = {
            mes: d.getMonth() + 1,
            anio: d.getFullYear(),
            total_casas: resumen.total_casas,
            consumo_total: 0,
            valor_total: 0,
            casas_excedidas: 0
          };
        }
        historicoMap[key].consumo_total += Number(l.consumo) || 0;
        historicoMap[key].valor_total += Number(l.valor) || 0;
        if ((Number(l.consumo_cobrar) || 0) > 0) historicoMap[key].casas_excedidas++;
      });

      // Ordenar cronológicamente
      const sortedComp = Object.values(historicoMap).sort((a, b) => 
        (a.anio * 100 + a.mes) - (b.anio * 100 + b.mes)
      );

      setData({
        mes: mesSeleccionado, anio: anioSeleccionado,
        porCasa, excedidas, resumen,
        comparativo: sortedComp
      });

    } catch (err: any) {
      setError('Error al generar el reporte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera y descarga el reporte en formato Excel (Client-side)
   */
  const exportarExcel = async () => {
    if (!data) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const fileSaver = await import('file-saver');
      const saveAs = fileSaver.saveAs || (fileSaver as any).default?.saveAs;
      
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(`Reporte_${MESES[mesSeleccionado-1]}`);

      // Colores corporativos (Mismos de Lecturas)
      const darkBlue = 'FF1E3A8A';
      const brightBlue = 'FF3B82F6';
      const white = 'FFFFFFFF';
      const redExceso = 'FF991B1B';
      const greenValor = 'FF166534';

      // 1. TÍTULO PRINCIPAL (Fila 1)
      const mesNombre = MESES[mesSeleccionado - 1];
      ws.mergeCells('A1:G1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `Condominio Campestre La Florida — Reporte Detallado ${mesNombre} ${anioSeleccionado}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: white } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkBlue } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 40;

      // 2. SUBTÍTULO (Fila 2)
      ws.mergeCells('A2:G2');
      const subtitleCell = ws.getCell('A2');
      const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      subtitleCell.value = `Resumen consolidado generado el ${fechaHoy}`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF4B5563' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(2).height = 25;

      // 3. ENCABEZADOS DE COLUMNA (Fila 3)
      const headers = ['Casa', 'Lect. Anterior', 'Lect. Actual', 'Consumo (m³)', 'Exceso (m³)', 'Valor ($)', 'Fecha'];
      ws.getRow(3).values = headers;
      ws.getRow(3).height = 20;

      ws.columns = [
        { key: 'casa', width: 15 },
        { key: 'ant', width: 18 },
        { key: 'act', width: 18 },
        { key: 'con', width: 15 },
        { key: 'exc', width: 15 },
        { key: 'val', width: 20 },
        { key: 'fec', width: 15 },
      ];

      ws.getRow(3).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brightBlue } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: white } },
          left: { style: 'thin', color: { argb: white } },
          bottom: { style: 'thin', color: { argb: white } },
          right: { style: 'thin', color: { argb: white } }
        };
      });

      // 4. DATOS (desde Fila 4)
      data.porCasa.forEach(row => {
        const r = ws.addRow({
          casa: `Casa ${row.numero_casa}`,
          ant: Number(row.lectura_anterior),
          act: Number(row.lectura_actual),
          con: Number(row.consumo),
          exc: Number(row.consumo_cobrar),
          val: Number(row.valor),
          fec: new Date(row.fecha).toLocaleDateString('es-CO')
        });

        r.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          
          if (colNumber === 2 || colNumber === 3) {
            cell.numFmt = '0.00';
            cell.alignment = { horizontal: 'right' };
          }
          if (colNumber === 6) {
            cell.numFmt = '"$"#,##0';
            cell.font = { color: { argb: greenValor }, bold: true };
          }
          if (colNumber === 5 && (Number(cell.value) || 0) > 0) {
            cell.font = { color: { argb: redExceso }, bold: true };
          }
          if (colNumber === 1) {
            cell.alignment = { horizontal: 'left' };
          }
        });
      });

      // 5. FILA DE TOTALES
      const totalRow = ws.addRow({
        casa: 'TOTAL GENERAL',
        con: data.porCasa.reduce((s, l) => s + (Number(l.consumo) || 0), 0),
        exc: data.porCasa.reduce((s, l) => s + (Number(l.consumo_cobrar) || 0), 0),
        val: data.porCasa.reduce((s, l) => s + (Number(l.valor) || 0), 0),
      });

      totalRow.height = 25;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkBlue } };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' };
        if (colNumber === 6) cell.numFmt = '"$"#,##0';
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Reporte_Consolidado_${mesNombre}_${anioSeleccionado}.xlsx`);
    } catch (err) {
      console.error('Error Excel:', err);
      alert('Error al generar el Excel');
    }
  };

  const maxConsumo = data
    ? Math.max(...data.comparativo.map((c) => Number(c.consumo_total)), 1)
    : 1;

  const TABS: { key: 'resumen' | 'detalle' | 'comparativo'; label: string }[] = [
    { key: 'resumen',      label: 'Casas excedidas' },
    { key: 'detalle',      label: 'Todas las casas' },
    { key: 'comparativo',  label: 'Comparativo' },
  ];

  return (
    <div style={{
      padding: '2.5rem',
      fontFamily: "'Courier New', monospace",
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={exportarExcel}
            style={{
              background: '#16a34a', border: 'none',
              color: '#ffffff', padding: '0.8rem 1.5rem', fontSize: '0.8rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)',
              display: 'flex', alignItems: 'center', gap: '0.6rem'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#15803d'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '1.1rem' }}>↓</span> EXPORTAR REPORTE EXCEL
          </button>

          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Módulo</p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
              Reporte — <span style={{ color: ACCENT }}>{MESES[mesSeleccionado - 1]} {anioSeleccionado}</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.04em' }}>
              Análisis de consumo y facturación del período seleccionado
            </p>
          </div>
        </div>

        {/* ── Selectores de Fecha ── */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mes</span>
            <select 
              value={mesSeleccionado} 
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.6rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1} style={{ background: '#0a0a0f', color: '#fff' }}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Año</span>
            <select 
              value={anioSeleccionado} 
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
              style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.6rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y} style={{ background: '#0a0a0f', color: '#fff' }}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>⚠</span> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem', fontSize: '1rem' }}>◌</span>
          Cargando reporte...
        </div>
      ) : data && (
        <>
          {/* ── Stats cards ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem',
          }}>
            {[
              { label: 'Casas registradas', value: data.resumen.total_casas,                                  accent: '#60a5fa', icon: '⬡' },
              { label: 'Consumo total',      value: `${Math.round(data.resumen.consumo_total)} m³`,           accent: '#4ade80', icon: '◈' },
              { label: 'Casas excedidas',    value: data.resumen.casas_excedidas,                             accent: '#f87171', icon: '⚠' },
              { label: 'Total a cobrar',     value: `$${Math.round(data.resumen.valor_total).toLocaleString('es-CO')}`, accent: '#fbbf24', icon: '◎' },
            ].map((s, idx) => (
              <div key={s.label} style={{
                background: '#0a0a0f', padding: '1.25rem 1.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                animation: `fadeSlideIn 0.35s ease ${idx * 0.07}s both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: s.accent, opacity: 0.6 }}>{s.icon}</span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.accent, opacity: 0.5, display: 'inline-block' }} />
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: s.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {s.value}
                </span>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginTop: '0.15rem' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '0' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  flex: 1, border: 'none', padding: '0.85rem',
                  background: tab === t.key ? `${ACCENT}12` : '#0a0a0f',
                  color: tab === t.key ? ACCENT : 'rgba(255,255,255,0.45)',
                  fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'inherit', fontWeight: tab === t.key ? 700 : 400,
                  borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Excedidas ── */}
          {tab === 'resumen' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.04em' }}>
                  CASAS QUE SUPERARON <span style={{ color: '#f87171' }}>60 m³</span>
                </h2>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.08em' }}>
                  {data.excedidas.length} casas
                </span>
              </div>
              {data.excedidas.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
                  <div style={{ color: '#4ade80', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                    Ninguna casa superó el límite este mes
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Casa', 'Consumo', 'Exceso', 'Valor a cobrar'].map((h, i) => (
                          <th key={h} style={{ padding: '0.9rem 1rem', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 3 ? 'right' : 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.excedidas.map((l, i) => (
                        <tr key={i}
                          style={{
                            background: hoveredRow === i ? 'rgba(248,113,113,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s',
                            animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`,
                          }}
                          onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700 }}>Casa {l.numero_casa}</td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#60a5fa' }}>{Math.round(l.consumo)} m³</td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem' }}>
                            <span style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '0.2rem 0.55rem', border: '1px solid rgba(248,113,113,0.25)', fontWeight: 700 }}>
                              {Math.round(l.consumo_cobrar)} m³
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#fbbf24', fontWeight: 700, textAlign: 'right' }}>
                            ${Math.round(l.valor).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Todas las casas ── */}
          {tab === 'detalle' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.04em' }}>
                  TODAS LAS CASAS — <span style={{ color: ACCENT }}>{MESES[mesSeleccionado - 1]}</span>
                </h2>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{data.porCasa.length} registros</span>
              </div>
              {data.porCasa.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.85rem' }}>
                  Sin lecturas registradas este mes
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Casa', 'Anterior', 'Actual', 'Consumo', 'Exceso', 'Valor', 'Fecha'].map((h, i) => (
                          <th key={h} style={{ padding: '0.9rem 1rem', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 6 ? 'right' : 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.porCasa.map((l, i) => (
                        <tr key={i}
                          style={{
                            background: hoveredRow === i + 100 ? `${ACCENT}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s',
                            animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                          }}
                          onMouseEnter={() => setHoveredRow(i + 100)} onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700 }}>Casa {l.numero_casa}</td>
                          <td style={{ padding: '1rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 1)' }}>{Math.round(l.lectura_anterior)}</td>
                          <td style={{ padding: '1rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 1)' }}>{Math.round(l.lectura_actual)}</td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600 }}>{Math.round(l.consumo)} m³</td>
                          <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                            {l.consumo_cobrar > 0 ? (
                              <span style={{ color: '#f87171', fontWeight: 700 }}>{Math.round(l.consumo_cobrar)} m³</span>
                            ) : (
                              <span style={{ color: '#4ade80', fontSize: '0.7rem', background: 'rgba(74,222,128,0.08)', padding: '0.15rem 0.45rem', border: '1px solid rgba(74,222,128,0.2)' }}>OK</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem', fontWeight: 700 }}>
                            {l.valor > 0 ? (
                              <span style={{ color: '#fbbf24' }}>${Math.round(l.valor).toLocaleString('es-CO')}</span>
                            ) : (
                              <span style={{ color: 'rgba(255, 255, 255, 1)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 1)', textAlign: 'right' }}>
                            {new Date(l.fecha).toLocaleDateString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Comparativo ── */}
          {tab === 'comparativo' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', overflow: 'hidden' }}>
               <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.04em' }}>
                  COMPARATIVO <span style={{ color: ACCENT }}>ÚLTIMOS MESES</span>
                </h2>
                
                {/* Selectores de Rango */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Desde:</span>
                    <select value={mesInicio} onChange={e => setMesInicio(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}>
                      {MESES.map((m, i) => <option key={i} value={i+1} style={{ background: '#0a0a0f' }}>{m}</option>)}
                    </select>
                    <select value={anioInicio} onChange={e => setAnioInicio(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0a0a0f' }}>{y}</option>)}
                    </select>
                  </div>
                  <div style={{ width: '1px', height: '15px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hasta:</span>
                    <select value={mesFin} onChange={e => setMesFin(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}>
                      {MESES.map((m, i) => <option key={i} value={i+1} style={{ background: '#0a0a0f' }}>{m}</option>)}
                    </select>
                    <select value={anioFin} onChange={e => setAnioFin(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}>
                      {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0a0a0f' }}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Barras */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.comparativo.map((c, i) => {
                  const pct = Math.round((Number(c.consumo_total) / maxConsumo) * 100);
                  const isCurrent = c.mes === mesSeleccionado && c.anio === anioSeleccionado;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', animation: `fadeSlideIn 0.3s ease ${i * 0.06}s both` }}>
                      <div style={{ width: '80px', flexShrink: 0, textAlign: 'right', fontSize: '0.72rem', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? ACCENT : 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                        {MESES[c.mes - 1].slice(0, 3)} {String(c.anio).slice(2)}
                      </div>
                      <div style={{ flex: 1, height: '28px', background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem',
                          width: `${Math.max(pct, 3)}%`,
                          background: isCurrent
                            ? `linear-gradient(90deg, ${ACCENT}80, ${ACCENT})`
                            : 'rgba(96,165,250,0.35)',
                          transition: 'width 0.6s ease',
                        }}>
                          {pct > 15 && (
                            <span style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 700 }}>
                              {Math.round(c.consumo_total)} m³
                            </span>
                          )}
                        </div>
                        {isCurrent && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: `1px solid ${ACCENT}50`, pointerEvents: 'none' }} />
                        )}
                      </div>
                      <div style={{ width: '80px', flexShrink: 0, textAlign: 'right', fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                        ${Math.round(c.valor_total).toLocaleString('es-CO')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabla comparativo */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '550px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Mes', 'Casas', 'Consumo total', 'Excedidas', 'Total cobrado'].map((h, i) => (
                        <th key={h} style={{ padding: '0.9rem 1rem', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 4 ? 'right' : 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.comparativo.map((c, i) => {
                      const isCurrent = c.mes === mesSeleccionado && c.anio === anioSeleccionado;
                      return (
                        <tr key={i}
                          style={{
                            background: isCurrent ? `${ACCENT}08` : hoveredRow === i + 200 ? 'rgba(255,255,255,0.025)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s',
                            animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`,
                          }}
                          onMouseEnter={() => setHoveredRow(i + 200)} onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <span style={{ fontSize: '0.82rem', color: isCurrent ? ACCENT : '#ffffff', fontWeight: isCurrent ? 700 : 500 }}>
                              {MESES[c.mes - 1]} {c.anio}
                            </span>
                            {isCurrent && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.55rem', color: ACCENT, letterSpacing: '0.08em', border: `1px solid ${ACCENT}40`, padding: '0.1rem 0.35rem' }}>
                                actual
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 1)' }}>{c.total_casas}</td>
                          <td style={{ padding: '1rem', fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600 }}>{Math.round(c.consumo_total)} m³</td>
                          <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                            {c.casas_excedidas > 0 ? (
                              <span style={{ color: '#f87171', fontWeight: 700 }}>{c.casas_excedidas}</span>
                            ) : (
                              <span style={{ color: '#4ade80' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 700, textAlign: 'right' }}>
                            ${Math.round(c.valor_total).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}