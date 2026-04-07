'use client';

import { useEffect, useState } from 'react';

type Rol = 'admin' | 'trabajador' | 'residente';

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  casa_id: number | null;
  numero_casa?: string | null;
};

type Casa = { id: number; numero_casa: string };

const ACCENT = '#a78bfa';

const ROL_META: Record<Rol, { color: string; label: string; icon: string }> = {
  admin:      { color: '#a78bfa', label: 'Admin',      icon: '◈' },
  trabajador: { color: '#60a5fa', label: 'Trabajador', icon: '⬡' },
  residente:  { color: '#4ade80', label: 'Residente',  icon: '◎' },
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [casas, setCasas]         = useState<Casa[]>([]);
  const [loading, setLoading]     = useState(true);
  const [errorMsg, setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [visible, setVisible]     = useState(false);

  const [isEditing, setIsEditing]   = useState(false);
  const [currentId, setCurrentId]   = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [nombre,   setNombre]   = useState('');
  const [correo,   setCorreo]   = useState('');
  const [password, setPassword] = useState('');
  const [rol,      setRol]      = useState<Rol>('residente');
  const [casaId,   setCasaId]   = useState('');

  useEffect(() => {
    fetchData();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ru, rc] = await Promise.all([fetch('/api/usuarios'), fetch('/api/casas')]);
      if (!ru.ok || !rc.ok) throw new Error('Error al cargar datos');
      setUsuarios(await ru.json());
      setCasas(await rc.json());
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, isErr = false) => {
    isErr ? setErrorMsg(msg) : setSuccessMsg(msg);
    setTimeout(() => isErr ? setErrorMsg('') : setSuccessMsg(''), isErr ? 5000 : 3000);
  };

  const resetForm = () => {
    setIsEditing(false); setCurrentId(null);
    setNombre(''); setCorreo(''); setPassword(''); setRol('residente'); setCasaId('');
  };

  const handleEdit = (u: Usuario) => {
    setIsEditing(true); setCurrentId(u.id);
    setNombre(u.nombre); setCorreo(u.correo); setRol(u.rol);
    setCasaId(u.casa_id ? String(u.casa_id) : ''); setPassword('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      const payload = { id: currentId, nombre, correo, rol, casa_id: casaId ? Number(casaId) : null, password };
      const res = await fetch('/api/usuarios', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify(`Usuario ${isEditing ? 'actualizado' : 'creado'} correctamente`);
      resetForm(); fetchData();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      notify('Usuario eliminado'); fetchData();
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setDeletingId(null);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focusedField === field ? ACCENT + '70' : 'rgba(255,255,255,0.08)'}`,
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
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Administración</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
            Gestión de <span style={{ color: ACCENT }}>Usuarios</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
            Administra accesos y vincula residentes a sus casas
          </p>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['admin','trabajador','residente'] as Rol[]).map(r => {
              const count = usuarios.filter(u => u.rol === r).length;
              if (!count) return null;
              const meta = ROL_META[r];
              return (
                <div key={r} style={{ padding: '0.35rem 0.75rem', background: `${meta.color}10`, border: `1px solid ${meta.color}25`, fontSize: '0.6rem', color: meta.color, letterSpacing: '0.08em' }}>
                  {count} {meta.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Alertas ── */}
      {errorMsg && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>⚠</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.75rem 1rem', fontSize: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ── Formulario ── */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${isEditing ? '#fbbf24' : ACCENT}60, transparent)` }} />
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Formulario</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.04em' }}>
              {isEditing ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}
            </h2>
          </div>
          {isEditing && (
            <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', border: '1px solid #fbbf2440', color: '#fbbf24', letterSpacing: '0.1em' }}>Editando</span>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'nombre' ? ACCENT : 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>Nombre</label>
            <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              style={inputStyle('nombre')} onFocus={() => setFocusedField('nombre')} onBlur={() => setFocusedField(null)} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'correo' ? ACCENT : 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>Correo</label>
            <input required type="email" value={correo} onChange={e => setCorreo(e.target.value)}
              style={inputStyle('correo')} onFocus={() => setFocusedField('correo')} onBlur={() => setFocusedField(null)} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: focusedField === 'pass' ? ACCENT : 'rgba(255,255,255,0.4)', marginBottom: '0.4rem', transition: 'color 0.2s' }}>
              Password {isEditing && <span style={{ color: 'rgba(255, 255, 255, 1)' }}>(opcional)</span>}
            </label>
            <input required={!isEditing} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEditing ? 'Sin cambios' : ''}
              style={inputStyle('pass')} onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginBottom: '0.4rem' }}>Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value as Rol)} style={{ ...inputStyle('rol'), appearance: 'none' as any, color: ROL_META[rol].color }}>
              <option value="residente"  style={{ background: '#0a0a0f', color: '#4ade80' }}>◎ Residente</option>
              <option value="trabajador" style={{ background: '#0a0a0f', color: '#60a5fa' }}>⬡ Trabajador</option>
              <option value="admin"      style={{ background: '#0a0a0f', color: '#a78bfa' }}>◈ Admin</option>
            </select>
          </div>
          {rol === 'residente' && (
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginBottom: '0.4rem' }}>Casa</label>
              <select value={casaId} onChange={e => setCasaId(e.target.value)} style={{ ...inputStyle('casa'), appearance: 'none' as any }}>
                <option value="" style={{ background: '#0a0a0f' }}>— Ninguna</option>
                {casas.map(c => <option key={c.id} value={c.id} style={{ background: '#0a0a0f' }}>Casa {c.numero_casa}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '1px' }}>
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255, 255, 255, 1)', padding: '0.65rem 1.25rem', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}>
                CANCELAR
              </button>
            )}
            <button type="submit" disabled={formLoading}
              style={{
                background: formLoading ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
                border: `1px solid ${formLoading ? 'rgba(255,255,255,0.08)' : ACCENT + '50'}`,
                color: formLoading ? 'rgba(255,255,255,0.3)' : ACCENT,
                padding: '0.65rem 1.75rem', fontSize: '0.72rem', letterSpacing: '0.12em',
                cursor: formLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}35, ${ACCENT}18)`; }}
              onMouseLeave={e => { if (!formLoading) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`; }}
            >
              {formLoading
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Guardando...</>
                : isEditing ? '→ Actualizar' : '+ Crear'
              }
            </button>
          </div>
        </form>
      </div>

      {/* ── Tabla ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}40, transparent)` }} />
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Lista</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>TODOS LOS USUARIOS</h2>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{usuarios.length} registros</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['#', 'Nombre', 'Correo', 'Rol', 'Casa', 'Acciones'].map((h, i) => (
                  <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 5 ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
                    <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuarios.map((u, i) => {
                  const meta = ROL_META[u.rol];
                  const isHov = hoveredRow === u.id;
                  return (
                    <tr key={u.id}
                      style={{
                        background: isHov ? `${ACCENT}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s',
                        animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                      }}
                      onMouseEnter={() => setHoveredRow(u.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 700 }}>{u.nombre}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 1)' }}>{u.correo}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.55rem', border: `1px solid ${meta.color}35`, color: meta.color, background: `${meta.color}10`, letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>{meta.icon}</span> {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.75rem', color: u.numero_casa ? '#ffffff' : 'rgba(255,255,255,0.2)' }}>
                        {u.numero_casa ? <span style={{ color: '#4ade80' }}>Casa {u.numero_casa}</span> : '—'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <button onClick={() => handleEdit(u)}
                          style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, color: 'rgba(255, 255, 255, 1)', padding: '0.35rem 0.8rem', fontSize: '0.62rem', letterSpacing: '0.08em', cursor: 'pointer', marginRight: '0.4rem', transition: 'all 0.2s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT + '60'; e.currentTarget.style.color = ACCENT; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                          EDITAR
                        </button>
                        <button onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}
                          style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.7)', padding: '0.35rem 0.7rem', fontSize: '0.62rem', letterSpacing: '0.08em', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)'; e.currentTarget.style.background = 'transparent'; }}>
                          {deletingId === u.id ? '◌' : '✕'}
                        </button>
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
        select option { background: #0a0a0f; }
        ::placeholder { color: rgba(255,255,255,0.18) !important; }
      `}</style>
    </div>
  );
}