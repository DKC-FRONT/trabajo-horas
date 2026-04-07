'use client';

import { useEffect, useState } from 'react';

type Casa = { id: number; numero_casa: string };

const ACCENT = '#f472b6';

export default function CasasPage() {
  const [casas, setCasas]         = useState<Casa[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [visible, setVisible]     = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [nuevaCasa, setNuevaCasa] = useState('');
  const [editValor, setEditValor] = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [fieldError, setFieldError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetchCasas();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchCasas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/casas');
      setCasas(await res.json());
    } catch {
      setError('Error al cargar las casas.');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3500);
  };

  const handleAgregar = async () => {
    setFieldError('');
    if (!nuevaCasa.trim()) { setFieldError('Ingresa un número de casa.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/casas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_casa: nuevaCasa.trim() }),
      });
      const data = await res.json();
      if (data.error) { notify(data.error, 'error'); return; }
      notify('Casa agregada correctamente.', 'success');
      setNuevaCasa('');
      await fetchCasas();
    } catch { notify('Error al agregar la casa.', 'error'); }
    finally { setSaving(false); }
  };

  const startEdit = (casa: Casa) => {
    setEditingId(casa.id); setEditValor(casa.numero_casa);
    setError(''); setSuccess('');
  };

  const cancelEdit = () => { setEditingId(null); setEditValor(''); };

  const handleEditar = async (id: number) => {
    if (!editValor.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/casas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, numero_casa: editValor.trim() }),
      });
      const data = await res.json();
      if (data.error) { notify(data.error, 'error'); return; }
      notify('Casa actualizada correctamente.', 'success');
      setEditingId(null);
      await fetchCasas();
    } catch { notify('Error al actualizar.', 'error'); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta casa? No se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/casas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.error) { notify(data.error, 'error'); return; }
      notify('Casa eliminada correctamente.', 'success');
      await fetchCasas();
    } catch { notify('Error al eliminar.', 'error'); }
    finally { setDeletingId(null); }
  };

  const inputStyle = (field: string, hasError = false): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasError ? 'rgba(248,113,113,0.5)' : focusedField === field ? ACCENT + '70' : 'rgba(255,255,255,0.08)'}`,
    boxShadow: focusedField === field ? `0 0 0 3px ${ACCENT}10` : 'none',
    color: '#ffffff', fontSize: '0.82rem', padding: '0.65rem 0.85rem',
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
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Módulo</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Gestión de <span style={{ color: ACCENT }}>Casas</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
            Directorio de unidades residenciales del condominio
          </p>
        </div>
        {!loading && (
          <div style={{ padding: '0.4rem 0.9rem', background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, fontSize: '0.65rem', color: ACCENT, letterSpacing: '0.1em', height: 'fit-content' }}>
            {casas.length} {casas.length === 1 ? 'casa' : 'casas'}
          </div>
        )}
      </div>

      {/* ── Alertas ── */}
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>⚠</span> {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>✓</span> {success}
        </div>
      )}

      {/* ── Formulario agregar ── */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}60, transparent)` }} />
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Registro</p>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>AGREGAR CASA</h2>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'nueva' ? ACCENT : 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>
              Número de casa {fieldError && <span style={{ color: '#f87171' }}>· {fieldError}</span>}
            </label>
            <input
              type="text" placeholder="Ej: 12, A-5, 101..." value={nuevaCasa}
              onChange={e => { setNuevaCasa(e.target.value); setFieldError(''); }}
              onFocus={() => setFocusedField('nueva')} onBlur={() => setFocusedField(null)}
              onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              style={inputStyle('nueva', !!fieldError)}
            />
          </div>
          <button onClick={handleAgregar} disabled={saving}
            style={{
              background: saving ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
              border: `1px solid ${saving ? 'rgba(255,255,255,0.08)' : ACCENT + '50'}`,
              color: saving ? 'rgba(255,255,255,0.3)' : ACCENT,
              padding: '0.65rem 1.5rem', fontSize: '0.72rem', letterSpacing: '0.12em',
              cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}35, ${ACCENT}18)`; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`; }}
          >
            {saving ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Guardando...</> : <>+ Agregar</>}
          </button>
        </div>
      </div>

      {/* ── Lista ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}40, transparent)` }} />
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Directorio</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>CASAS REGISTRADAS</h2>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{casas.length} registros</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
            <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
          </div>
        ) : casas.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem', opacity: 0.25 }}>⬡</div>
            <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>Sin casas registradas todavía</div>
          </div>
        ) : (
          <div>
            {casas.map((casa, i) => {
              const isEditing = editingId === casa.id;
              const isHov = hoveredRow === casa.id && !isEditing;
              return (
                <div key={casa.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 1.5rem', gap: '1rem',
                    background: isEditing ? `${ACCENT}06` : isHov ? `${ACCENT}07` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                    borderBottom: i < casas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.15s',
                    animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                  }}
                  onMouseEnter={() => { if (!isEditing) setHoveredRow(casa.id); }}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {isEditing ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.1em', textTransform: 'uppercase', width: '30px' }}>Casa</span>
                        <input
                          autoFocus type="text" value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          onFocus={() => setFocusedField('edit')} onBlur={() => setFocusedField(null)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditar(casa.id); if (e.key === 'Escape') cancelEdit(); }}
                          style={{ ...inputStyle('edit'), width: '120px', padding: '0.45rem 0.7rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleEditar(casa.id)} disabled={saving}
                          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', padding: '0.4rem 0.85rem', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}>
                          ✓ Guardar
                        </button>
                        <button onClick={cancelEdit}
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255, 255, 255, 1)', padding: '0.4rem 0.85rem', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                          ✕ Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '36px', height: '36px',
                          background: `${ACCENT}10`, border: `1px solid ${ACCENT}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.9rem', color: ACCENT, flexShrink: 0,
                          transition: 'background 0.2s, border-color 0.2s',
                        }}>
                          ⬡
                        </div>
                        <div>
                          <div style={{ fontSize: '0.55rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Unidad</div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.03em' }}>
                            {casa.numero_casa}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', opacity: isHov ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                        <button onClick={() => startEdit(casa)}
                          style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(255, 255, 255, 1)', padding: '0.4rem 0.85rem', fontSize: '0.62rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT + '60'; e.currentTarget.style.color = ACCENT; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                          ✎ Editar
                        </button>
                        <button onClick={() => handleEliminar(casa.id)} disabled={deletingId === casa.id}
                          style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.7)', padding: '0.4rem 0.85rem', fontSize: '0.62rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)'; e.currentTarget.style.background = 'transparent'; }}>
                          {deletingId === casa.id ? '◌' : '✕ Eliminar'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::placeholder { color: rgba(255,255,255,0.15) !important; }
      `}</style>
    </div>
  );
}