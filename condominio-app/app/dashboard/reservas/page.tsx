'use client';

import { useEffect, useState } from 'react';

type Rol = 'admin' | 'trabajador' | 'residente';
type EstadoReserva = 'pendiente' | 'aprobada' | 'rechazada';

type UserSession = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  casa_id?: number | null;
};

type Reserva = {
  id: number;
  casa_id: number;
  numero_casa: string;
  area: string;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoReserva;
};

type Casa = { id: number; numero_casa: string };

const ACCENT = '#4ade80';

const HORARIOS = [
  '08:00','09:00','10:00','11:00','12:00','13:00',
  '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
];

const AREAS = ['Piscina', 'Salón Social', 'Cancha Múltiple', 'Zona BBQ'];

const ESTADO_META: Record<EstadoReserva, { color: string; label: string }> = {
  pendiente: { color: '#fbbf24', label: 'Pendiente' },
  aprobada:  { color: '#4ade80', label: 'Aprobada'  },
  rechazada: { color: '#f87171', label: 'Rechazada' },
};

export default function ReservasPage() {
  const [user, setUser]         = useState<UserSession | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [casas, setCasas]       = useState<Casa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [visible, setVisible]   = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Form
  const [area, setArea]           = useState('Piscina');
  const [fecha, setFecha]         = useState('');
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [horaFin, setHoraFin]     = useState('12:00');
  const [casaSeleccionada, setCasaSeleccionada] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        // Si es residente, preseleccionar su casa
        if (u.casa_id) setCasaSeleccionada(String(u.casa_id));
        fetchReservas(u);
        if (u.rol === 'admin') fetchCasas();
      } else {
        setLoading(false);
      }
    } catch { setLoading(false); }
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchCasas = async () => {
    try {
      const res = await fetch('/api/casas');
      if (res.ok) setCasas(await res.json());
    } catch {}
  };

  const fetchReservas = async (usr: UserSession) => {
    try {
      setLoading(true);
      const url = usr.rol === 'residente' && usr.casa_id
        ? `/api/reservas?casa_id=${usr.casa_id}`
        : '/api/reservas';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al obtener reservas');
      setReservas(await res.json());
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, err = false) => {
    err ? setErrorMsg(msg) : setSuccessMsg(msg);
    setTimeout(() => err ? setErrorMsg('') : setSuccessMsg(''), err ? 6000 : 3500);
  };

  const getCasaId = (): number | null => {
    if (user?.rol === 'residente') return user.casa_id ?? null;
    if (casaSeleccionada) return Number(casaSeleccionada);
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const casaId = getCasaId();
    if (!casaId) {
      notify(user?.rol === 'residente'
        ? 'Tu cuenta no tiene una casa vinculada. Contacta al administrador.'
        : 'Selecciona una casa para la reserva.', true);
      return;
    }
    if (!fecha) { notify('Selecciona una fecha para la reserva.', true); return; }
    if (horaInicio >= horaFin) { notify('La hora de inicio debe ser anterior a la hora de fin.', true); return; }

    try {
      setFormLoading(true);
      const payload = {
        casa_id: casaId,
        area,
        fecha_reserva: fecha,
        hora_inicio: horaInicio + ':00',
        hora_fin: horaFin + ':00',
      };
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la reserva');
      notify('Reserva solicitada correctamente');
      setFecha('');
      setHoraInicio('10:00');
      setHoraFin('12:00');
      if (user?.rol === 'admin') setCasaSeleccionada('');
      if (user) fetchReservas(user);
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setFormLoading(false);
    }
  };

  const cambiarEstado = async (id: number, estado: EstadoReserva) => {
    try {
      const res = await fetch('/api/reservas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      });
      if (!res.ok) throw new Error('Error al cambiar el estado');
      notify(`Reserva ${estado}`);
      if (user) fetchReservas(user);
    } catch (err: any) { notify(err.message, true); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
      const res = await fetch('/api/reservas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Error al cancelar');
      notify('Reserva cancelada');
      if (user) fetchReservas(user);
    } catch (err: any) { notify(err.message, true); }
  };

  const fieldStyle = (field: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focusedField === field ? ACCENT + '80' : 'rgba(255,255,255,0.12)'}`,
    boxShadow: focusedField === field ? `0 0 0 3px ${ACCENT}15` : 'none',
    color: '#ffffff', fontSize: '0.8rem', padding: '0.65rem 0.85rem',
    fontFamily: "'Courier New', monospace", outline: 'none', appearance: 'none' as any,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const labelStyle = (field?: string): React.CSSProperties => ({
    display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: field && focusedField === field ? ACCENT : 'rgba(255,255,255,0.55)',
    marginBottom: '0.4rem', transition: 'color 0.2s',
  });

  const counts = {
    pendiente: reservas.filter(r => r.estado === 'pendiente').length,
    aprobada:  reservas.filter(r => r.estado === 'aprobada').length,
    rechazada: reservas.filter(r => r.estado === 'rechazada').length,
  };

  const canCreateReserva = user?.rol === 'admin' || (user?.rol === 'residente' && !!user.casa_id);

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
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Áreas <span style={{ color: ACCENT }}>Comunes</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.04em' }}>
            {user?.rol === 'admin'
              ? 'Gestión de todas las reservas del condominio'
              : user?.casa_id
                ? 'Reserva zonas comunes para tu casa'
                : 'Vincula tu cuenta a una casa para reservar'}
          </p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(Object.entries(counts) as [EstadoReserva, number][])
              .filter(([, n]) => n > 0)
              .map(([estado, n]) => (
                <div key={estado} style={{
                  padding: '0.35rem 0.75rem',
                  background: `${ESTADO_META[estado].color}15`,
                  border: `1px solid ${ESTADO_META[estado].color}40`,
                  fontSize: '0.62rem', color: ESTADO_META[estado].color, letterSpacing: '0.08em',
                }}>
                  {n} {ESTADO_META[estado].label}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Alertas ── */}
      {errorMsg && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.85rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0 }}>⚠</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.85rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ── Formulario ── */}
      {canCreateReserva && (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}70, transparent)` }} />

          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Nueva solicitud</p>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>RESERVAR ÁREA COMÚN</h2>
            </div>
            {user?.rol === 'admin' && (
              <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', border: `1px solid ${ACCENT}40`, color: ACCENT, letterSpacing: '0.1em' }}>Admin</span>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>

            {/* Select casa — solo admin */}
            {user?.rol === 'admin' && (
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle('casa')}>Casa *</label>
                <select value={casaSeleccionada} onChange={e => setCasaSeleccionada(e.target.value)}
                  style={fieldStyle('casa')} required
                  onFocus={() => setFocusedField('casa')} onBlur={() => setFocusedField(null)}>
                  <option value="" style={{ background: '#0a0a0f', color: 'rgba(255, 255, 255, 1)' }}>— Seleccionar casa</option>
                  {casas.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#0a0a0f', color: '#fff' }}>
                      Casa {c.numero_casa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Área */}
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle('area')}>Área</label>
              <select value={area} onChange={e => setArea(e.target.value)}
                style={fieldStyle('area')}
                onFocus={() => setFocusedField('area')} onBlur={() => setFocusedField(null)}>
                {AREAS.map(a => (
                  <option key={a} value={a} style={{ background: '#0a0a0f', color: '#fff' }}>{a}</option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle('fecha')}>Fecha *</label>
              <input required type="date" value={fecha}
                onChange={e => setFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ ...fieldStyle('fecha'), colorScheme: 'dark' }}
                onFocus={() => setFocusedField('fecha')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* Hora inicio */}
            <div style={{ flex: '1 1 120px' }}>
              <label style={labelStyle('ini')}>Desde</label>
              <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                style={fieldStyle('ini')}
                onFocus={() => setFocusedField('ini')} onBlur={() => setFocusedField(null)}>
                {HORARIOS.slice(0, -1).map(h => (
                  <option key={h} value={h} style={{ background: '#0a0a0f', color: '#fff' }}>{h}</option>
                ))}
              </select>
            </div>

            {/* Hora fin */}
            <div style={{ flex: '1 1 120px' }}>
              <label style={labelStyle('fin')}>Hasta</label>
              <select value={horaFin} onChange={e => setHoraFin(e.target.value)}
                style={fieldStyle('fin')}
                onFocus={() => setFocusedField('fin')} onBlur={() => setFocusedField(null)}>
                {HORARIOS.slice(1).map(h => (
                  <option key={h} value={h} style={{ background: '#0a0a0f', color: '#fff' }}>{h}</option>
                ))}
              </select>
            </div>

            {/* Botón */}
            <div>
              <button type="submit" disabled={formLoading}
                style={{
                  background: formLoading ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`,
                  border: `1px solid ${formLoading ? 'rgba(255,255,255,0.08)' : ACCENT + '60'}`,
                  color: formLoading ? 'rgba(255,255,255,0.3)' : ACCENT,
                  padding: '0.65rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
                  cursor: formLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit', fontWeight: 600,
                }}
                onMouseEnter={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}40, ${ACCENT}20)`; }}
                onMouseLeave={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`; }}
              >
                {formLoading
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Enviando...</>
                  : <>→ Solicitar reserva</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Aviso residente sin casa */}
      {user?.rol === 'residente' && !user.casa_id && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderLeft: '3px solid #fbbf24', padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '0.8rem', color: '#fbbf24' }}>
          ⚠ Tu cuenta no está vinculada a ninguna casa. Contacta al administrador para que la asigne.
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}50, transparent)` }} />
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Historial</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {user?.rol === 'admin' ? 'TODAS LAS RESERVAS' : 'MIS RESERVAS'}
            </h2>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{reservas.length} registros</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Casa', 'Área', 'Fecha', 'Horario', 'Estado', 'Acciones'].map((h, i) => (
                  <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 5 ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
                  <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
                </td></tr>
              ) : reservas.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.25 }}>📅</div>
                  <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.82rem', letterSpacing: '0.05em' }}>No hay reservas agendadas</div>
                  {canCreateReserva && (
                    <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.7rem', marginTop: '0.35rem' }}>Usa el formulario de arriba para crear una</div>
                  )}
                </td></tr>
              ) : (
                reservas.map((r, i) => {
                  const meta = ESTADO_META[r.estado];
                  const isHov = hoveredRow === r.id;
                  const fechaFmt = new Date(r.fecha_reserva + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <tr key={r.id}
                      style={{
                        background: isHov ? `${ACCENT}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.15s',
                        animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                      }}
                      onMouseEnter={() => setHoveredRow(r.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700 }}>Casa {r.numero_casa}</td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 1)' }}>{r.area}</td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.77rem', color: 'rgba(255, 255, 255, 1)' }}>{fechaFmt}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontSize: '0.74rem', color: ACCENT, background: `${ACCENT}12`, padding: '0.22rem 0.6rem', border: `1px solid ${ACCENT}30`, fontWeight: 600 }}>
                          {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontSize: '0.62rem', padding: '0.22rem 0.6rem', border: `1px solid ${meta.color}40`, color: meta.color, background: `${meta.color}12`, letterSpacing: '0.08em', fontWeight: 600 }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {user?.rol === 'admin' && r.estado === 'pendiente' && (
                            <>
                              <button onClick={() => cambiarEstado(r.id, 'aprobada')}
                                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', padding: '0.3rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: 600 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.1)'}>
                                ✓ Aprobar
                              </button>
                              <button onClick={() => cambiarEstado(r.id, 'rechazada')}
                                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.3rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: 600 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}>
                                ✕ Rechazar
                              </button>
                            </>
                          )}
                          {(user?.rol === 'admin' || (user?.rol === 'residente' && r.estado === 'pendiente')) && (
                            <button onClick={() => handleDelete(r.id)}
                              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255, 255, 255, 1)', padding: '0.3rem 0.65rem', fontSize: '0.62rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}>
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { background: #0a0a0f; color: #ffffff; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        ::placeholder { color: rgba(255,255,255,0.3) !important; }
      `}</style>
    </div>
  );
}