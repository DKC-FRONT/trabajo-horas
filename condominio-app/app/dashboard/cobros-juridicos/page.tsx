'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ACCENT = '#f87171';
const MESES_NOMBRES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type Casa = { id: number; numero_casa: string };

type Cobro = {
  id: number;
  numero_casa: string;
  propietario: string | null;
  valor_mora: number;
  concepto: string | null;
  meses_mora: string | null;
  fecha_notificacion: string;
  fecha_limite: string | null;
  estado: string;
  notas: string | null;
  created_at: string;
};

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${focused ? ACCENT + '70' : 'rgba(255,255,255,0.08)'}`,
  boxShadow: focused ? `0 0 0 3px ${ACCENT}10` : 'none',
  color: '#fdf5e6', fontSize: '1.2rem', padding: '0.65rem 0.85rem',
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
});

const btnBase: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '1.02rem', letterSpacing: '0.1em', textTransform: 'uppercase',
  cursor: 'pointer', transition: 'all 0.25s ease',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
}

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CobrosJuridicosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sqlHint, setSqlHint] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [tab, setTab] = useState<'registrar' | 'lista'>('lista');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showCarta, setShowCarta] = useState<Cobro | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [searchCasa, setSearchCasa] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form state
  const [selectedCasas, setSelectedCasas] = useState<string[]>([]);
  const [form, setForm] = useState({
    propietario: '',
    valor_mora: '',
    concepto: 'Expensas comunes',
    meses_mora: '',
    fecha_notificacion: new Date().toISOString().split('T')[0],
    fecha_limite: '',
    notas: '',
  });

  // Edit state
  const [editCobro, setEditCobro] = useState<Cobro | null>(null);

  useEffect(() => {
    fetchData();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cobrosRes, casasRes] = await Promise.all([
        fetch('/api/cobros-juridicos'),
        fetch('/api/cobros-juridicos?tipo=casas'),
      ]);
      
      const cobrosData = await cobrosRes.json();
      const casasData = await casasRes.json();

      if (cobrosData.error) {
        setErrorMsg(cobrosData.error);
        if (cobrosData.sql_hint) setSqlHint(cobrosData.sql_hint);
        setCobros([]);
      } else {
        setCobros(cobrosData);
        setErrorMsg('');
        setSqlHint('');
      }

      if (Array.isArray(casasData)) {
        setCasas(casasData);
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setErrorMsg(msg); setSuccessMsg(''); }
    else { setSuccessMsg(msg); setErrorMsg(''); }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
  };

  const toggleCasa = (num: string) => {
    setSelectedCasas(prev =>
      prev.includes(num) ? prev.filter(c => c !== num) : [...prev, num]
    );
  };

  const handleRegistrar = async () => {
    if (selectedCasas.length === 0) {
      notify('Selecciona al menos una casa.', true);
      return;
    }
    if (!form.valor_mora || isNaN(Number(form.valor_mora))) {
      notify('Ingresa un valor de mora válido.', true);
      return;
    }

    setSaving(true);
    try {
      const cobrosToSend = selectedCasas.map(num => ({
        numero_casa: num,
        propietario: form.propietario || null,
        valor_mora: Number(form.valor_mora),
        concepto: form.concepto,
        meses_mora: form.meses_mora || null,
        fecha_notificacion: form.fecha_notificacion,
        fecha_limite: form.fecha_limite || null,
        notas: form.notas || null,
      }));

      const res = await fetch('/api/cobros-juridicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cobros: cobrosToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify(data.message);
      setSelectedCasas([]);
      setForm({
        propietario: '', valor_mora: '', concepto: 'Cuota de administración',
        meses_mora: '', fecha_notificacion: new Date().toISOString().split('T')[0],
        fecha_limite: '', notas: '',
      });
      setTab('lista');
      fetchData();
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEstado = async (id: number, estado: string) => {
    try {
      const res = await fetch('/api/cobros-juridicos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCobros(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
      notify(`Cobro marcado como "${estado}".`);
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editCobro) return;
    try {
      setSaving(true);
      const res = await fetch('/api/cobros-juridicos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCobro.id,
          propietario: editCobro.propietario,
          valor_mora: editCobro.valor_mora,
          concepto: editCobro.concepto,
          meses_mora: editCobro.meses_mora,
          notas: editCobro.notas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCobros(prev => prev.map(c => c.id === editCobro.id ? { ...c, ...editCobro } : c));
      notify('Cambios guardados exitosamente.');
      setEditCobro(null);
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cobro permanentemente?')) return;
    try {
      const res = await fetch('/api/cobros-juridicos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCobros(prev => prev.filter(c => c.id !== id));
      notify('Cobro eliminado.');
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    }
  };

  const handleDownloadPdf = async () => {
    if (!showCarta) return;
    const element = document.getElementById('carta-prejuridica');
    if (!element) return;

    try {
      setDownloadingPdf(true);
      const html2pdf = (await import('html2pdf.js')).default;

      await html2pdf()
        .from(element)
        .set({
          margin: 0,
          filename: `Cobro_Prejuridico_Casa_${showCarta.numero_casa}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] }
        } as any)
        .save();

    } catch (err) {
      console.error('Error al generar PDF', err);
      notify('Error al generar el PDF', true);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const filteredCobros = filtroEstado === 'todos' 
    ? cobros 
    : cobros.filter(c => c.estado === filtroEstado);

  const filteredCasas = searchCasa 
    ? casas.filter(c => c.numero_casa.includes(searchCasa)) 
    : casas;

  const estadoColor: Record<string, string> = {
    activo: '#f87171',
    pagado: '#4ade80',
    archivado: '#94a3b8',
  };

  // ─── RENDER ───

  return (
    <>
      <div id="cobros-page-content" style={{
        padding: '2.5rem',
        fontFamily: 'inherit',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.35rem' }}>Jurídicos</p>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 700, color: '#fdf5e6', margin: 0, letterSpacing: '-0.01em' }}>
            Cobros <span style={{ color: ACCENT }}>Prejurídicos</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.4)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
            Gestión de notificaciones de cobro prejurídico para propietarios en mora
          </p>
        </div>

        {/* Mensajes */}
        {errorMsg && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.75rem 1rem', fontSize: '1.13rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>⚠</span> {errorMsg}
            </div>
            {sqlHint && (
              <pre style={{ 
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.75rem', fontSize: '0.98rem', color: '#fbbf24', margin: '0.5rem 0 0', 
                whiteSpace: 'pre-wrap', width: '100%', overflowX: 'auto',
              }}>
                {sqlHint}
              </pre>
            )}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.75rem 1rem', fontSize: '1.13rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {(['lista', 'registrar'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...btnBase,
                background: tab === t ? `${ACCENT}12` : 'transparent',
                border: 'none', borderBottom: tab === t ? `2px solid ${ACCENT}` : '2px solid transparent',
                color: tab === t ? '#fdf5e6' : 'rgba(255,255,255,0.4)',
                padding: '0.75rem 1.5rem',
                fontWeight: tab === t ? 700 : 400,
              }}
              onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
            >
              {t === 'lista' ? '📋 Cobros Registrados' : '➕ Nuevo Cobro'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '1.27rem' }}>
            <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
          </div>
        ) : tab === 'registrar' ? (
          /* ═══════ TAB REGISTRAR ═══════ */
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

            {/* Panel izquierdo: selección de casas */}
            <div style={{ flex: '1 1 280px', maxWidth: '340px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}40, transparent)` }} />
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.2rem' }}>Seleccionar</p>
                <h3 style={{ fontSize: '1.27rem', fontWeight: 700, color: '#fdf5e6', margin: 0 }}>CASAS EN MORA</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', margin: '0.3rem 0 0' }}>
                  {selectedCasas.length} seleccionada(s)
                </p>
              </div>

              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <input
                  type="text"
                  placeholder="Buscar casa..."
                  value={searchCasa}
                  onChange={e => setSearchCasa(e.target.value)}
                  style={{ ...inputStyle(false), fontSize: '1.05rem', padding: '0.5rem 0.75rem' }}
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredCasas.map(casa => {
                  const isSelected = selectedCasas.includes(casa.numero_casa);
                  return (
                    <button
                      key={casa.id}
                      onClick={() => toggleCasa(casa.numero_casa)}
                      style={{
                        width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer',
                        padding: '0.6rem 1.25rem',
                        background: isSelected ? `${ACCENT}15` : 'transparent',
                        borderLeft: isSelected ? `3px solid ${ACCENT}` : '3px solid transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: '16px', height: '16px', border: isSelected ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.2)',
                        background: isSelected ? `${ACCENT}30` : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', color: ACCENT, flexShrink: 0,
                      }}>
                        {isSelected && '✓'}
                      </div>
                      <span style={{ fontSize: '1.17rem', color: isSelected ? '#fdf5e6' : 'rgba(255,255,255,0.6)', fontWeight: isSelected ? 700 : 400 }}>
                        Casa {casa.numero_casa}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Seleccionar todas / ninguna */}
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedCasas(casas.map(c => c.numero_casa))}
                  style={{ ...btnBase, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.4rem 0.8rem', fontSize: '0.87rem', flex: 1 }}
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedCasas([])}
                  style={{ ...btnBase, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', padding: '0.4rem 0.8rem', fontSize: '0.87rem', flex: 1 }}
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* Panel derecho: formulario */}
            <div style={{ flex: '1 1 400px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}60, transparent)` }} />
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.2rem' }}>Datos del cobro</p>
                <h3 style={{ fontSize: '1.27rem', fontWeight: 700, color: '#fdf5e6', margin: 0 }}>INFORMACIÓN DEL COBRO</h3>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Propietario (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.propietario}
                      onChange={e => setForm(p => ({ ...p, propietario: e.target.value }))}
                      onFocus={() => setFocusedField('propietario')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'propietario')}
                      placeholder="Nombre del propietario"
                    />
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Valor en mora <span style={{ color: ACCENT }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={form.valor_mora}
                      onChange={e => setForm(p => ({ ...p, valor_mora: e.target.value }))}
                      onFocus={() => setFocusedField('valor_mora')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'valor_mora')}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Concepto
                    </label>
                    <input
                      type="text"
                      value={form.concepto}
                      onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                      onFocus={() => setFocusedField('concepto')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'concepto')}
                      placeholder="Cuota de administración"
                    />
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Meses en mora
                    </label>
                    <input
                      type="text"
                      value={form.meses_mora}
                      onChange={e => setForm(p => ({ ...p, meses_mora: e.target.value }))}
                      onFocus={() => setFocusedField('meses_mora')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'meses_mora')}
                      placeholder="Ej: Enero - Mayo 2026"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Fecha de notificación
                    </label>
                    <input
                      type="date"
                      value={form.fecha_notificacion}
                      onChange={e => setForm(p => ({ ...p, fecha_notificacion: e.target.value }))}
                      onFocus={() => setFocusedField('fecha_notif')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'fecha_notif')}
                    />
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Fecha límite de pago
                    </label>
                    <input
                      type="date"
                      value={form.fecha_limite}
                      onChange={e => setForm(p => ({ ...p, fecha_limite: e.target.value }))}
                      onFocus={() => setFocusedField('fecha_lim')}
                      onBlur={() => setFocusedField(null)}
                      style={inputStyle(focusedField === 'fecha_lim')}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.87rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                    Notas adicionales
                  </label>
                  <textarea
                    value={form.notas}
                    onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                    onFocus={() => setFocusedField('notas')}
                    onBlur={() => setFocusedField(null)}
                    rows={3}
                    style={{ ...inputStyle(focusedField === 'notas'), resize: 'vertical' as const }}
                    placeholder="Observaciones del cobro..."
                  />
                </div>

                {/* Resumen */}
                {selectedCasas.length > 0 && form.valor_mora && (
                  <div style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`, padding: '0.85rem 1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: 700 }}>Resumen</p>
                    <p style={{ fontSize: '1.13rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.2rem' }}>
                      Casas: <strong style={{ color: '#fdf5e6' }}>{selectedCasas.join(', ')}</strong>
                    </p>
                    <p style={{ fontSize: '1.13rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                      Total a cobrar: <strong style={{ color: '#fdf5e6' }}>{formatCurrency(Number(form.valor_mora) * selectedCasas.length)}</strong>
                      <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>
                        ({formatCurrency(Number(form.valor_mora))} × {selectedCasas.length})
                      </span>
                    </p>
                  </div>
                )}

                {/* Botón registrar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={handleRegistrar}
                    disabled={saving || selectedCasas.length === 0}
                    style={{
                      ...btnBase,
                      background: saving ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`,
                      border: `1px solid ${saving ? 'rgba(255,255,255,0.08)' : ACCENT + '50'}`,
                      color: saving ? 'rgba(255,255,255,0.3)' : ACCENT,
                      padding: '0.7rem 2rem', fontSize: '1.08rem',
                      opacity: selectedCasas.length === 0 ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { if (!saving && selectedCasas.length > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 15px ${ACCENT}20`; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {saving ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Guardando...</> : '⚖ REGISTRAR COBRO(S)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════ TAB LISTA ═══════ */
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}40, transparent)` }} />

            {/* Filtro por estado */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.2rem' }}>Historial</p>
                <h3 style={{ fontSize: '1.27rem', fontWeight: 700, color: '#fdf5e6', margin: 0 }}>
                  {filteredCobros.length} COBRO{filteredCobros.length !== 1 ? 'S' : ''}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['todos', 'activo', 'pagado', 'archivado'].map(e => (
                  <button
                    key={e}
                    onClick={() => setFiltroEstado(e)}
                    style={{
                      ...btnBase,
                      background: filtroEstado === e ? `${estadoColor[e] || ACCENT}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${filtroEstado === e ? (estadoColor[e] || ACCENT) + '40' : 'rgba(255,255,255,0.08)'}`,
                      color: filtroEstado === e ? '#fdf5e6' : 'rgba(255,255,255,0.4)',
                      padding: '0.4rem 0.85rem', fontSize: '0.9rem',
                    }}
                  >
                    {e === 'todos' ? '📋 Todos' : e === 'activo' ? '🔴 Activo' : e === 'pagado' ? '🟢 Pagado' : '📁 Archivado'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla */}
            {filteredCobros.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '1.2rem' }}>
                Sin cobros registrados {filtroEstado !== 'todos' ? `con estado "${filtroEstado}"` : ''}
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr>
                      {['Casa', 'Propietario', 'Valor Mora', 'Meses', 'Fecha', 'Estado', 'Acciones'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.83rem',
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCobros.map((cobro, i) => (
                      <tr
                        key={cobro.id}
                        onMouseEnter={() => setHoveredRow(cobro.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          background: hoveredRow === cobro.id ? 'rgba(255,255,255,0.03)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '1.2rem', color: '#fdf5e6', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          🏠 {cobro.numero_casa}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '1.13rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                          {cobro.propietario || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '1.2rem', color: ACCENT, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {formatCurrency(cobro.valor_mora)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                          {cobro.meses_mora || '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                          {formatDate(cobro.fecha_notificacion)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                            padding: '0.2rem 0.5rem',
                            background: `${estadoColor[cobro.estado] || '#94a3b8'}15`,
                            border: `1px solid ${estadoColor[cobro.estado] || '#94a3b8'}40`,
                            color: estadoColor[cobro.estado] || '#94a3b8',
                          }}>
                            {cobro.estado}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', opacity: hoveredRow === cobro.id ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                            <button onClick={() => setShowCarta(cobro)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.4rem', cursor: 'pointer', borderRadius: '4px' }} title="Ver/Imprimir Carta">📄</button>
                            <button onClick={() => setEditCobro(cobro)} style={{ background: 'transparent', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa', padding: '0.4rem', cursor: 'pointer', borderRadius: '4px' }} title="Editar Datos">✏️</button>
                            {cobro.estado === 'activo' && (
                              <button onClick={() => handleUpdateEstado(cobro.id, 'pagado')} style={{ background: 'transparent', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e', padding: '0.4rem', cursor: 'pointer', borderRadius: '4px' }} title="Marcar Pagado">✓</button>
                            )}
                            {cobro.estado !== 'archivado' && (
                              <button
                                onClick={() => handleUpdateEstado(cobro.id, 'archivado')}
                                title="Archivar"
                                style={{ ...btnBase, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', color: '#94a3b8', padding: '0.3rem 0.55rem', fontSize: '0.9rem' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                              >
                                📁
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(cobro.id)}
                              title="Eliminar"
                              style={{ ...btnBase, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '0.3rem 0.55rem', fontSize: '0.9rem' }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ MODAL EDITAR COBRO ═══════ */}
      {editCobro && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', overflowY: 'auto' }} onClick={() => setEditCobro(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', width: '100%', maxWidth: '500px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#fff', fontSize: '1.5rem' }}>Editar Cobro — Casa {editCobro.numero_casa}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Propietario</label>
                <input type="text" value={editCobro.propietario || ''} onChange={e => setEditCobro({ ...editCobro, propietario: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Valor adeudado</label>
                <input type="number" value={editCobro.valor_mora} onChange={e => setEditCobro({ ...editCobro, valor_mora: Number(e.target.value) })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Concepto</label>
                <input type="text" value={editCobro.concepto || ''} onChange={e => setEditCobro({ ...editCobro, concepto: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Meses en mora</label>
                <input type="text" value={editCobro.meses_mora || ''} onChange={e => setEditCobro({ ...editCobro, meses_mora: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>Notas</label>
                <textarea value={editCobro.notas || ''} onChange={e => setEditCobro({ ...editCobro, notas: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '6px', minHeight: '80px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setEditCobro(null)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 1, background: '#4ade80', border: 'none', color: '#000', fontWeight: 'bold', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════ MODAL CARTA PREJURÍDICA ═══════ */}
      {showCarta && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            padding: '2rem', overflowY: 'auto',
          }}
          onClick={() => setShowCarta(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
          >
            {/* Botones de control */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                style={{
                  ...btnBase,
                  background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24', padding: '0.55rem 1.2rem', fontSize: '1.05rem',
                  opacity: downloadingPdf ? 0.7 : 1, cursor: downloadingPdf ? 'wait' : 'pointer'
                }}
                onMouseEnter={e => { if(!downloadingPdf) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { if(!downloadingPdf) e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {downloadingPdf ? '⏳ GENERANDO...' : '📥 DESCARGAR PDF'}
              </button>
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  const cartaEl = document.getElementById('carta-prejuridica');
                  if (!cartaEl) return;
                  printWin.document.write(`
                    <!DOCTYPE html>
                    <html><head>
                      <base href="${window.location.origin}" />
                      <title>Cobro Prejurídico - Casa ${showCarta.numero_casa}</title>
                      <style>
                        @page { margin: 2cm; size: letter; }
                        body { margin: 0; font-family: 'Times New Roman', serif; color: #000; }
                        * { box-sizing: border-box; }
                      </style>
                    </head><body>
                      ${cartaEl.innerHTML}
                    </body></html>
                  `);
                  printWin.document.close();
                  setTimeout(() => { printWin.print(); }, 500);
                }}
                style={{
                  ...btnBase,
                  background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)',
                  color: '#60a5fa', padding: '0.55rem 1.2rem', fontSize: '1.05rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                🖨 IMPRIMIR
              </button>
              <button
                onClick={() => setShowCarta(null)}
                style={{
                  ...btnBase,
                  background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)',
                  color: '#f87171', padding: '0.55rem 1.2rem', fontSize: '1.05rem',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                ✕ CERRAR
              </button>
            </div>

            <div
              id="carta-prejuridica"
              style={{
                background: '#fdf5e6', color: '#000000',
                padding: '2.5rem 3rem', fontFamily: 'inherit',
                fontSize: '9pt', lineHeight: 1.45,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
            >
              {/* Encabezado */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
                <img src="/La%20Florida%20logo.png" alt="Logo La Florida" style={{ height: '75px', marginBottom: '0.4rem', objectFit: 'contain' }} />
                <h2 style={{ margin: '0 0 0.2rem', fontSize: '12pt', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  CONJUNTO RESIDENCIAL LA FLORIDA
                </h2>
                <p style={{ margin: 0, fontSize: '8pt', color: '#333' }}>NIT: 900.858.163</p>
                <p style={{ margin: 0, fontSize: '8pt', color: '#333' }}>Kilometro 5 vereda la poyata</p>
              </div>

              {/* Fecha y asunto */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.1rem', fontSize: '8pt', color: '#666' }}>Fecha de notificación:</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>{formatDate(showCarta.fecha_notificacion)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 0.1rem', fontSize: '8pt', color: '#666' }}>Inmueble:</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '10pt' }}>Casa N° {showCarta.numero_casa}</p>
                </div>
              </div>

              {/* Destinatario */}
              <div style={{ marginBottom: '1.2rem' }}>
                <p style={{ margin: 0 }}><strong>Señor(a):</strong></p>
                <p style={{ margin: '0.1rem 0', fontSize: '12pt', fontWeight: 700, textTransform: 'uppercase' }}>
                  {showCarta.propietario || 'PROPIETARIO / RESIDENTE'}
                </p>
                <p style={{ margin: 0, color: '#333' }}>
                  Casa {showCarta.numero_casa} — Conjunto Residencial La Florida
                </p>
              </div>

              {/* Asunto */}
              <div style={{ background: '#f5f5f5', padding: '0.5rem 0.8rem', marginBottom: '1.2rem', borderLeft: '4px solid #cc0000' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '9pt' }}>
                  ASUNTO: COBRO PREJURÍDICO — {(showCarta.concepto || 'Cuota de administración').toUpperCase()}
                </p>
              </div>

              {/* Cuerpo */}
              <div style={{ textAlign: 'justify' }}>
                <p style={{ margin: '0 0 0.8rem' }}>Respetado(a) propietario(a),</p>

                <p style={{ margin: '0 0 0.8rem' }}>
                  Por medio de la presente, la Administración del <strong>CONJUNTO RESIDENCIAL LA FLORIDA</strong> se
                  permite informarle que a la fecha presenta una <strong>obligación pendiente de pago</strong> correspondiente
                  al concepto de <strong>{showCarta.concepto || 'cuota de administración'}</strong>,
                  {showCarta.meses_mora && <> por el periodo de <strong>{showCarta.meses_mora}</strong>,</>} por un
                  valor total de:
                </p>

                {/* Monto destacado */}
                <div style={{
                  textAlign: 'center', margin: '1.2rem 0', padding: '0.8rem',
                  border: '2px solid #cc0000', background: '#fff5f5',
                  pageBreakInside: 'avoid'
                }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '8pt', color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Valor adeudado</p>
                  <p style={{ margin: 0, fontSize: '18pt', fontWeight: 700, color: '#cc0000' }}>
                    {formatCurrency(showCarta.valor_mora)}
                  </p>
                </div>

                <p style={{ margin: '0 0 0.8rem' }}>
                  De conformidad con lo establecido en la <strong>Ley 675 de 2001</strong> (Régimen de Propiedad Horizontal), 
                  artículos <strong>29</strong> y <strong>30</strong>, todo propietario tiene la obligación de contribuir con las 
                  expensas comunes necesarias, ordinarias y extraordinarias. El no pago oportuno genera intereses moratorios 
                  a la tasa máxima legal vigente.
                </p>

                <p style={{ margin: '0 0 0.8rem' }}>
                  Le instamos a ponerse al día con su obligación dentro de los <strong>quince (15) días hábiles</strong> siguientes 
                  a la fecha de recibo de esta comunicación{showCarta.fecha_limite && <>, es decir, a más tardar el <strong>{formatDate(showCarta.fecha_limite)}</strong></>}. 
                  De no recibir su pago en el término indicado, la administración se verá en la obligación de iniciar 
                  las <strong>acciones judiciales correspondientes</strong> (proceso ejecutivo), lo cual generará costos 
                  adicionales por concepto de honorarios de abogado y costas procesales que serán a su cargo.
                </p>

                <p style={{ margin: '0 0 0.8rem' }}>
                  Para su pronta solución, puede acercarse a la administración en horario de oficina o comunicarse al 
                  teléfono de contacto disponible para coordinar un plan de pago.
                </p>

                {showCarta.notas && (
                  <div style={{ background: '#f9f9f9', padding: '0.6rem 0.8rem', margin: '0.8rem 0', borderLeft: '3px solid #999', fontStyle: 'italic', color: '#555', pageBreakInside: 'avoid', fontSize: '8pt' }}>
                    <strong>Nota:</strong> {showCarta.notas}
                  </div>
                )}

                <p style={{ margin: '0 0 0.8rem' }}>Cordialmente,</p>

                <div style={{ marginTop: '1.2rem', pageBreakInside: 'avoid' }}>
                  <img src="/Firma%20admin.png" alt="Firma Administrador" style={{ height: '70px', marginBottom: '-10px', display: 'block' }} />
                  <div style={{ borderTop: '1px solid #000', width: '220px', paddingTop: '0.4rem' }}>
                    <p style={{ margin: '0 0 0.1rem', fontWeight: 700 }}>ADMINISTRACIÓN</p>
                    <p style={{ margin: 0, fontSize: '8pt', color: '#444' }}>Conjunto Residencial La Florida</p>
                  </div>
                </div>
              </div>

              {/* Pie */}
              <div style={{ marginTop: '1.2rem', paddingTop: '0.6rem', borderTop: '1px solid #ccc', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '6.5pt', color: '#888', letterSpacing: '0.05em' }}>
                  Este documento es una notificación de cobro prejurídico y hace parte del debido proceso de cobro de la copropiedad.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        ::placeholder { color: rgba(255,255,255,0.18) !important; }
        @media print {
          .modal-overlay { display: none !important; }
        }
      `}</style>
    </>
  );
}