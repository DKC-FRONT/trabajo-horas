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
  const [data, setData]       = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [visible, setVisible] = useState(false);
  const [tab, setTab]         = useState<'resumen' | 'detalle' | 'comparativo'>('resumen');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const now  = new Date();
  const mes  = now.getMonth() + 1;
  const anio = now.getFullYear();

  useEffect(() => {
    fetchReporte();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchReporte = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/reportes?mes=${mes}&anio=${anio}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch {
      setError('Error al cargar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () =>
    window.open(`/api/reportes/excel?mes=${mes}&anio=${anio}`, '_blank');

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
        <div>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Módulo</p>
          <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
            Reporte — <span style={{ color: ACCENT }}>{MESES[mes - 1]} {anio}</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.04em' }}>
            Análisis de consumo y facturación del mes en curso
          </p>
        </div>
        <button onClick={exportarExcel}
          style={{
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)',
            color: '#fbbf24', padding: '0.55rem 1.1rem', fontSize: '0.72rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.2)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.35)'; }}
        >
          ↓ Exportar Excel
        </button>
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
                  TODAS LAS CASAS — <span style={{ color: ACCENT }}>{MESES[mes - 1]}</span>
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
              <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.04em' }}>
                  COMPARATIVO <span style={{ color: ACCENT }}>ÚLTIMOS 6 MESES</span>
                </h2>
              </div>

              {/* Barras */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.comparativo.map((c, i) => {
                  const pct = Math.round((Number(c.consumo_total) / maxConsumo) * 100);
                  const isCurrent = c.mes === mes && c.anio === anio;
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
                      const isCurrent = c.mes === mes && c.anio === anio;
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