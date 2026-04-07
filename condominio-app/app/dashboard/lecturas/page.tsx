'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Casa = { id: number; numero_casa: string };
type Lectura = {
  id: number;
  numero_casa: string;
  lectura_anterior: number;
  lectura_actual: number;
  consumo: number;
  consumo_cobrar: number;
  valor: number;
  fecha: string;
};

export default function LecturasPage() {
  const router = useRouter();
  const [casas, setCasas] = useState<Casa[]>([]);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    casa_id: '',
    lectura_anterior: '',
    lectura_actual: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([fetchCasas(), fetchLecturas()]);
    } catch {
      setError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCasas = async () => {
    const res = await fetch('/api/casas');
    const data = await res.json();
    setCasas(data);
  };

  const fetchLecturas = async () => {
    const res = await fetch('/api/lecturas');
    const data = await res.json();
    setLecturas(data);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.casa_id) errs.casa_id = 'Selecciona una casa';
    if (!form.fecha) errs.fecha = 'Selecciona una fecha';
    if (!form.lectura_anterior) errs.lectura_anterior = 'Requerido';
    if (!form.lectura_actual) errs.lectura_actual = 'Requerido';
    if (Number(form.lectura_actual) < Number(form.lectura_anterior)) {
      errs.lectura_actual = 'Debe ser ≥ anterior';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!validateForm()) return;
    setSaving(true);
    try {
      await fetch('/api/lecturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSuccess('Lectura guardada correctamente.');
      setForm({
        casa_id: '',
        lectura_anterior: '',
        lectura_actual: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      setFormErrors({});
      await fetchLecturas();
    } catch {
      setError('Error al guardar la lectura.');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta lectura?')) return;
    setDeletingId(id);
    await fetch('/api/lecturas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await fetchLecturas();
    setDeletingId(null);
  };

  const exportarExcel = () => window.open('/api/lecturas/excel', '_blank');

  const consumoTotal = Math.round(lecturas.reduce((s, l) => s + (Number(l.consumo) || 0), 0));
  const valorTotal = Math.round(lecturas.reduce((s, l) => s + (Number(l.valor) || 0), 0));

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Courier New', monospace", position: 'relative', overflow: 'hidden' }}>
      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Corner marks */}
      {['topleft', 'topright', 'bottomleft', 'bottomright'].map((pos) => (
        <div key={pos} style={{
          position: 'fixed',
          top: pos.startsWith('top') ? '1.5rem' : 'auto',
          bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto',
          left: pos.endsWith('left') ? '1.5rem' : 'auto',
          right: pos.endsWith('right') ? '1.5rem' : 'auto',
          width: '20px', height: '20px',
          borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderLeft: pos.endsWith('left') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderRight: pos.endsWith('right') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          zIndex: 10,
        }} />
      ))}

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 5, borderBottom: '2px solid rgba(255, 255, 255, 0.06)', padding: '0.5rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 1)', fontSize: '2rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Courier New', monospace", padding: 0 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 1)')}>
            ← Dashboard
          </button>
          <span style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.7rem' }}> / </span>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#60a5fa' }}>
            Lecturas de Agua
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.08em' }}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <button onClick={exportarExcel} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', padding: '0.2rem 0.5rem', color: '#fbbf24', fontSize: '0.5rem', fontFamily: "'Courier New', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; }}>
            ↓ Exportar Excel
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '100%', margin: '0 auto', padding: '1rem', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
        {/* Page title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.25rem' }}>
            Módulo activo
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Lecturas de Agua
          </h1>
        </div>

        {/* Summary stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}>
            {[
              { label: 'Registros', value: lecturas.length, accent: '#60a5fa' },
              { label: 'Consumo total (m³)', value: consumoTotal.toLocaleString('es-CO'), accent: '#4ade80' },
              { label: 'Valor total', value: `$${valorTotal.toLocaleString('es-CO')}`, accent: '#fbbf24' },
              { label: 'Casas registradas', value: casas.length, accent: '#f472b6' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#0a0a0f', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: s.accent, letterSpacing: '-0.02em' }}>
                  {s.value}
                </span>
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>⚠</span> {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#4ade80', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>✓</span> {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 1)', fontFamily: "'Courier New', monospace", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span>
            Cargando datos...
          </div>
        ) : (
          <>
            {/* Form */}
            <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.25rem' }}>
                    Formulario
                  </p>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Nueva Lectura
                  </h2>
                </div>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#60a5fa', padding: '0.1rem 0.3rem', border: '1px solid rgba(96,165,250,0.3)' }}>
                  Activo
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {/* Casa */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem', color: focused === 'casa' ? '#60a5fa' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                    Casa {formErrors.casa_id && <span style={{ color: '#f87171' }}>· {formErrors.casa_id}</span>}
                  </label>
                  <select value={form.casa_id} onChange={(e) => setForm({ ...form, casa_id: e.target.value })} onFocus={() => setFocused('casa')} onBlur={() => setFocused(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${formErrors.casa_id ? 'rgba(248,113,113,0.4)' : focused === 'casa' ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`, padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.8rem', fontFamily: "'Courier New', monospace", outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: focused === 'casa' ? '0 0 0 3px rgba(96,165,250,0.05)' : 'none' }}>
                    <option value="" style={{ background: '#0a0a0f' }}>Seleccionar...</option>
                    {casas.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#0a0a0f' }}>
                        Casa {c.numero_casa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem', color: focused === 'fecha' ? '#60a5fa' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                    Fecha {formErrors.fecha && <span style={{ color: '#f87171' }}>· {formErrors.fecha}</span>}
                  </label>
                  <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} onFocus={() => setFocused('fecha')} onBlur={() => setFocused(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${formErrors.fecha ? 'rgba(248,113,113,0.4)' : focused === 'fecha' ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`, padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.8rem', fontFamily: "'Courier New', monospace", outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: focused === 'fecha' ? '0 0 0 3px rgba(96,165,250,0.05)' : 'none' }} />
                </div>

                {/* Lectura anterior */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem', color: focused === 'anterior' ? '#60a5fa' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                    Lectura anterior {formErrors.lectura_anterior && <span style={{ color: '#f87171' }}>· {formErrors.lectura_anterior}</span>}
                  </label>
                  <input type="number" placeholder="0" value={form.lectura_anterior} onChange={(e) => setForm({ ...form, lectura_anterior: e.target.value })} onFocus={() => setFocused('anterior')} onBlur={() => setFocused(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${formErrors.lectura_anterior ? 'rgba(248,113,113,0.4)' : focused === 'anterior' ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`, padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.8rem', fontFamily: "'Courier New', monospace", outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: focused === 'anterior' ? '0 0 0 3px rgba(96,165,250,0.05)' : 'none' }} />
                </div>

                {/* Lectura actual */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem', color: focused === 'actual' ? '#60a5fa' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }}>
                    Lectura actual {formErrors.lectura_actual && <span style={{ color: '#f87171' }}>· {formErrors.lectura_actual}</span>}
                  </label>
                  <input type="number" placeholder="0" value={form.lectura_actual} onChange={(e) => setForm({ ...form, lectura_actual: e.target.value })} onFocus={() => setFocused('actual')} onBlur={() => setFocused(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${formErrors.lectura_actual ? 'rgba(248,113,113,0.4)' : focused === 'actual' ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`, padding: '0.5rem 0.75rem', color: '#ffffff', fontSize: '0.8rem', fontFamily: "'Courier New', monospace", outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: focused === 'actual' ? '0 0 0 3px rgba(96,165,250,0.05)' : 'none' }} />
                </div>
              </div>

              {/* Preview consumo */}
              {(() => {
                const anterior = Number(form.lectura_anterior);
                const actual = Number(form.lectura_actual);
                if (isNaN(anterior) || isNaN(actual) || !form.lectura_anterior || !form.lectura_actual || actual < anterior) return null;
                const consumo = actual - anterior;
                const consumoCobrar = Math.max(0, consumo - 60);
                const valor = consumoCobrar * 1605;
                return (
                  <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.05em' }}>
                      Vista previa →
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)' }}>
                      Consumo: <strong style={{ color: '#60a5fa' }}>{consumo.toFixed(2)} m³</strong>
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)' }}>
                      A cobrar: <strong style={{ color: consumoCobrar > 0 ? '#f87171' : '#4ade80' }}>
                        {consumoCobrar > 0 ? `${consumoCobrar.toFixed(2)} m³` : 'Dentro del límite'}
                      </strong>
                    </span>
                    {consumoCobrar > 0 && (
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)' }}>
                        Valor: <strong style={{ color: '#fbbf24' }}>${valor.toLocaleString('es-CO')}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.05em', marginLeft: 'auto' }}>
                      Límite: 60 m³ · Tarifa: $1.605/m³
                    </span>
                  </div>
                );
              })()}

              <div style={{ marginTop: '1rem' }}>
                <button onClick={handleSubmit} disabled={saving} style={{ padding: '0.5rem 1.5rem', fontSize: '0.7rem', fontFamily: "'Courier New', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', background: saving ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(147,51,234,0.15) 100%)', border: saving ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(96,165,250,0.35)', color: saving ? 'rgba(255,255,255,0.25)' : '#ffffff' }}>
                  {saving ? (
                    <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Guardando...</>
                  ) : (
                    <>→ Guardar lectura</>
                  )}
                </button>
              </div>
            </section>

            {/* Table */}
            <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginTop: '1.5rem' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.25rem' }}>
                    Tabla
                  </p>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Historial de Lecturas
                  </h2>
                </div>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.08em' }}>
                  {lecturas.length} registros
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Casa', 'Anterior', 'Actual', 'Consumo', 'Exceso', 'Valor', 'Fecha', ''].map((h) => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lecturas.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                          Sin registros todavía
                        </td>
                      </tr>
                    ) : (
                      lecturas.map((l, i) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          {[
                            { val: `Casa ${l.numero_casa}`, color: 'rgba(255, 255, 255, 1)', weight: 'bold' },
                            { val: (isNaN(l.lectura_anterior) || l.lectura_anterior == null) ? '—' : Math.round(l.lectura_anterior), color: 'rgba(255, 255, 255, 1)' },
                            { val: (isNaN(l.lectura_actual) || l.lectura_actual == null) ? '—' : Math.round(l.lectura_actual), color: 'rgba(255, 255, 255, 1)' },
                            { val: (isNaN(l.consumo) || l.consumo == null) ? '—' : `${Math.round(l.consumo)} m³`, color: '#60a5fa' },
                            { val: (isNaN(l.consumo_cobrar) || l.consumo_cobrar == null) ? '—' : (l.consumo_cobrar > 0 ? `${Math.round(l.consumo_cobrar)} m³` : '—'), color: '#f87171' },
                            { val: (isNaN(l.valor) || l.valor == null) ? '—' : (l.valor > 0 ? `$${Number(l.valor).toLocaleString('es-CO')}` : '—'), color: '#4ade80' },
                            { val: new Date(l.fecha).toLocaleDateString('es-CO'), color: 'rgba(255, 255, 255, 1)' },
                          ].map((cell, ci) => (
                            <td key={ci} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: cell.color, fontWeight: cell.weight === 'bold' ? 700 : 400, whiteSpace: 'nowrap' }}>
                              {cell.val}
                            </td>
                          ))}
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <button onClick={() => eliminar(l.id)} disabled={deletingId === l.id} style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.2rem 0.5rem', fontSize: '0.6rem', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s' }}>
                              {deletingId === l.id ? '◌' : '✕'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: #0a0a0f; color: #fff; }
        ::placeholder { color: rgba(255,255,255,0.15) !important; }
      `}</style>
    </div>
  );
}