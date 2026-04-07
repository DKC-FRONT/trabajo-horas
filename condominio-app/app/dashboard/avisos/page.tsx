'use client';

import { useEffect, useState } from 'react';

type Rol = 'admin' | 'trabajador' | 'residente';
type TipoAviso = 'general' | 'urgente' | 'recordatorio';

type Aviso = {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  fecha: string;
};

const ACCENT = '#fbbf24';

const TIPO_META: Record<TipoAviso, { color: string; icon: string; label: string }> = {
  general: { color: '#60a5fa', icon: '◈', label: 'General' },
  urgente: { color: '#f87171', icon: '⚠', label: 'Urgente' },
  recordatorio: { color: '#fbbf24', icon: '◎', label: 'Recordatorio' },
};

export default function AvisosPage() {
  const [user, setUser] = useState<{ rol?: Rol } | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [visible, setVisible] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<TipoAviso>('general');
  const [formLoading, setFormLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch { }
    fetchAvisos();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchAvisos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/avisos');
      if (!res.ok) throw new Error('Error al cargar avisos');
      setAvisos(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, isErr = false) => {
    isErr ? setErrorMsg(msg) : setSuccessMsg(msg);
    setTimeout(() => isErr ? setErrorMsg('') : setSuccessMsg(''), isErr ? 5000 : 3000);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return;
    try {
      setFormLoading(true);
      const res = await fetch('/api/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, mensaje, tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear aviso');
      notify('Aviso publicado correctamente');
      setTitulo(''); setMensaje(''); setTipo('general');
      fetchAvisos();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este aviso?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/avisos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify('Aviso eliminado');
      fetchAvisos();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setDeletingId(null);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focusedField === field ? ACCENT + '80' : 'rgba(255,255,255,0.08)'}`,
    boxShadow: focusedField === field ? `0 0 0 3px ${ACCENT}10` : 'none',
    color: '#ffffff', fontSize: '0.8rem', padding: '0.65rem 0.85rem',
    fontFamily: "'Courier New', monospace", outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

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
          <p style={{ fontSize: '1.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.90rem' }}>Módulo</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
            Cartelera de <span style={{ color: ACCENT }}>Avisos</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
            Anuncios y notificaciones del condominio
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {!loading && (
            <div style={{ padding: '0.4rem 0.9rem', background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, fontSize: '0.65rem', color: ACCENT, letterSpacing: '0.1em' }}>
              {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas ── */}
      {errorMsg && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ── Formulario admin ── */}
      {user?.rol === 'admin' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          {/* Accent line top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}60, transparent)` }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.9rem' }}>Formulario</p>
              <h2 style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, letterSpacing: '0.05em', fontWeight: 700 }}>PUBLICAR NUEVO AVISO</h2>
            </div>
            <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', border: `1px solid ${ACCENT}40`, color: ACCENT, letterSpacing: '0.1em' }}>Admin</span>
          </div>

          <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'titulo' ? ACCENT : 'rgba(255, 255, 255, 0.8)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>Título</label>
                <input required type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                  style={inputStyle('titulo')}
                  onFocus={() => setFocusedField('titulo')} onBlur={() => setFocusedField(null)} />
              </div>
              <div style={{ width: '165px' }}>
                <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginBottom: '0.4rem' }}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as TipoAviso)}
                  style={{ ...inputStyle('tipo'), appearance: 'none' as any, color: TIPO_META[tipo].color }}>
                  <option value="general" style={{ background: '#0a0a0f', color: '#60a5fa' }}>◈ General</option>
                  <option value="recordatorio" style={{ background: '#0a0a0f', color: '#fbbf24' }}>◎ Recordatorio</option>
                  <option value="urgente" style={{ background: '#0a0a0f', color: '#f87171' }}>⚠ Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'mensaje' ? ACCENT : 'rgba(255, 255, 255, 0.8)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>Mensaje</label>
              <textarea required rows={3} value={mensaje} onChange={e => setMensaje(e.target.value)}
                style={{ ...inputStyle('mensaje'), resize: 'vertical' }}
                onFocus={() => setFocusedField('mensaje')} onBlur={() => setFocusedField(null)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={formLoading}
                style={{
                  background: formLoading ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}10)`,
                  border: `1px solid ${formLoading ? 'rgba(255,255,255,0.08)' : ACCENT + '50'}`,
                  color: formLoading ? 'rgba(255,255,255,0.3)' : ACCENT,
                  padding: '0.6rem 1.75rem', fontSize: '0.72rem', letterSpacing: '0.12em',
                  cursor: formLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
                onMouseEnter={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}35, ${ACCENT}20)` }}
                onMouseLeave={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}10)` }}
              >
                {formLoading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Publicando...</> : <>→ Publicar aviso</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lista de Avisos ── */}
      <div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
              <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', fontSize: '1rem' }}>◌</span>
              Cargando avisos...
            </div>
          </div>
        ) : avisos.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>📢</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 1)', margin: 0, letterSpacing: '0.05em' }}>
              No hay avisos publicados en este momento.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {avisos.map((aviso, idx) => {
              const meta = TIPO_META[aviso.tipo];
              return (
                <div key={aviso.id} style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `3px solid ${meta.color}`,
                  padding: '1.25rem 1.25rem 1.25rem 1.1rem',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s',
                  animation: `fadeSlideIn 0.35s ease ${idx * 0.06}s both`,
                  cursor: 'default',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${meta.color}20`;
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)';
                  }}
                >
                  {/* Header card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: meta.color, fontSize: '0.85rem' }}>{meta.icon}</span>
                      <span style={{
                        fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: meta.color, padding: '0.15rem 0.5rem',
                        border: `1px solid ${meta.color}35`,
                        background: `${meta.color}10`,
                      }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)' }}>
                        {new Date(aviso.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      {user?.rol === 'admin' && (
                        <button
                          onClick={() => handleEliminar(aviso.id)}
                          disabled={deletingId === aviso.id}
                          style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,0.35)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.2rem', transition: 'color 0.2s, transform 0.15s', lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.35)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {deletingId === aviso.id ? '◌' : '✕'}
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '0.9rem', color: '#ffffff', margin: '0 0 0.6rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {aviso.titulo}
                  </h3>

                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', flex: 1 }}>
                    {aviso.mensaje}
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 1)', fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.06em' }}>
                    {new Date(aviso.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} hs
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { background: #0a0a0f; }
        ::placeholder { color: rgba(255, 255, 255, 1) !important; }
      `}</style>
    </div>
  );
}