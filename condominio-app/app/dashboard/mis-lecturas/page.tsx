'use client';

import { useEffect, useState } from 'react';

type Rol = 'admin' | 'trabajador' | 'residente';

type UserSession = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  casa_id?: number | null;
};

type Lectura = {
  id: number;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;
  consumo_cobrar: number;
  valor: number;
  fecha: string;
  mes: number;
  anio: number;
  numero_casa: string;
};

const ACCENT = '#60a5fa';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function MisLecturasPage() {
  const [user, setUser]           = useState<UserSession | null>(null);
  const [lecturas, setLecturas]   = useState<Lectura[]>([]);
  const [loading, setLoading]     = useState(true);
  const [errorMsg, setErrorMsg]   = useState('');
  const [visible, setVisible]     = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [mes, setMes]   = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
      else { setErrorMsg('No has iniciado sesión.'); setLoading(false); }
    } catch { setLoading(false); }
    setTimeout(() => setVisible(true), 50);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!user.casa_id) { setErrorMsg('Tu cuenta no está vinculada a ninguna casa.'); setLoading(false); return; }
    fetchLecturas();
  }, [user, mes, anio]);

  const fetchLecturas = async () => {
    if (!user?.casa_id) return;
    try {
      setLoading(true);
      let url = `/api/lecturas?casa_id=${user.casa_id}`;
      if (mes) url += `&mes=${mes}`;
      if (anio) url += `&anio=${anio}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener lecturas');
      setLecturas(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const totalConsumo = lecturas.reduce((s, l) => s + (Number(l.consumo) || 0), 0);
  const totalValor   = lecturas.reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const promedioConsumo = lecturas.length ? totalConsumo / lecturas.length : 0;

  return (
    <div style={{
      padding: '2.5rem',
      fontFamily: "'Courier New', monospace",
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Mi portal</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Mis <span style={{ color: ACCENT }}>Lecturas de Agua</span>
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
          {user?.casa_id ? `Historial de consumo · Casa ${user.casa_id}` : 'Vincula tu cuenta para ver tus lecturas'}
        </p>
      </div>

      {/* ── Error ── */}
      {errorMsg && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>⚠</span> {errorMsg}
        </div>
      )}

      {user?.casa_id && !errorMsg && (
        <>
          {/* ── Resumen de estadísticas ── */}
          {!loading && lecturas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
              {[
                { label: 'Lecturas',       value: lecturas.length,                          accent: ACCENT },
                { label: 'Consumo Total',  value: `${Math.round(totalConsumo)} m³`,         accent: '#a78bfa' },
                { label: 'Promedio/mes',   value: `${promedioConsumo.toFixed(1)} m³`,       accent: '#fb923c' },
                { label: 'Total a pagar',  value: formatCOP(totalValor),                    accent: '#f472b6' },
              ].map((stat, idx) => (
                <div key={stat.label} style={{ background: '#0a0a0f', padding: '1rem 1.25rem', animation: `fadeSlideIn 0.35s ease ${idx * 0.06}s both` }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: stat.accent, letterSpacing: '-0.02em' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginTop: '0.2rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Filtros ── */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginBottom: '0.35rem' }}>Mes</label>
              <select value={mes} onChange={e => setMes(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: mes ? '#ffffff' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', padding: '0.55rem 0.85rem', fontFamily: 'inherit', outline: 'none', appearance: 'none' as any, minWidth: '120px', transition: 'border 0.2s' }}
                onFocus={e => e.target.style.borderColor = ACCENT + '70'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <option value="" style={{ background: '#0a0a0f' }}>Todos</option>
                {MESES.map((m, i) => <option key={i+1} value={i+1} style={{ background: '#0a0a0f' }}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginBottom: '0.35rem' }}>Año</label>
              <select value={anio} onChange={e => setAnio(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', fontSize: '0.78rem', padding: '0.55rem 0.85rem', fontFamily: 'inherit', outline: 'none', appearance: 'none' as any, minWidth: '90px', transition: 'border 0.2s' }}
                onFocus={e => e.target.style.borderColor = ACCENT + '70'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <option value="" style={{ background: '#0a0a0f' }}>Todos</option>
                {[2023, 2024, 2025].map(y => <option key={y} value={y} style={{ background: '#0a0a0f' }}>{y}</option>)}
              </select>
            </div>
            {(mes || anio !== String(new Date().getFullYear())) && (
              <button onClick={() => { setMes(''); setAnio(String(new Date().getFullYear())); }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255, 255, 255, 1)', padding: '0.55rem 0.85rem', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>

          {/* ── Tabla ── */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}50, transparent)` }} />
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Historial</p>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>REGISTRO DE CONSUMO</h2>
              </div>
              {!loading && <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{lecturas.length} registros</span>}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Período', 'Lect. Ant.', 'Lect. Act.', 'Consumo', 'Exceso cobrable', 'Valor'].map((h, i) => (
                      <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 5 ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
                      <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
                    </td></tr>
                  ) : lecturas.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>💧</div>
                      <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>No hay lecturas para este período</div>
                    </td></tr>
                  ) : (
                    lecturas.map((l, i) => {
                      const isHov = hoveredRow === l.id;
                      const tieneExceso = Number(l.consumo_cobrar) > 0;
                      return (
                        <tr key={l.id}
                          style={{
                            background: isHov ? `${ACCENT}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.15s',
                            animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                          }}
                          onMouseEnter={() => setHoveredRow(l.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 700 }}>{MESES[l.mes - 1]} {l.anio}</div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', marginTop: '0.15rem' }}>
                              {new Date(l.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </div>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 1)' }}>
                            {Math.round(l.lectura_anterior)}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#ffffff', fontWeight: 700 }}>
                            {Math.round(l.lectura_actual)}
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: ACCENT, fontWeight: 600 }}>
                              {Math.round(l.consumo)} m³
                            </span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            {tieneExceso ? (
                              <span style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '0.2rem 0.55rem', border: '1px solid rgba(248,113,113,0.2)' }}>
                                {Math.round(l.consumo_cobrar)} m³
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(74,222,128,0.08)', padding: '0.2rem 0.55rem', border: '1px solid rgba(74,222,128,0.2)' }}>
                                Dentro del límite
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                            <span style={{ fontSize: '0.9rem', color: Number(l.valor) > 0 ? '#fbbf24' : '#4ade80', fontWeight: 700 }}>
                              {Number(l.valor) > 0 ? formatCOP(l.valor) : '$0'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { background: #0a0a0f; }
        ::placeholder { color: rgba(255,255,255,0.18) !important; }
      `}</style>
    </div>
  );
}
