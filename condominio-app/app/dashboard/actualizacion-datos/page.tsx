'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/client';

type Casa = {
  id: number;
  numero_casa: string;
  nombre_propietario: string | null;
  tipo_propiedad: string | null;
  es_arrendatario: boolean;
  nombre_arrendatario: string | null;
  celular: string | null;
  correo: string | null;
};

const ACCENT = '#38bdf8';

const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box' as const,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${focused ? ACCENT + '70' : 'rgba(255,255,255,0.08)'}`,
  boxShadow: focused ? `0 0 0 3px ${ACCENT}10` : 'none',
  color: '#ffffff', fontSize: '0.8rem', padding: '0.65rem 0.85rem',
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
});

export default function ActualizacionDatosPage() {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'trabajador' | 'residente' | null>(null);
  const [userCasaId, setUserCasaId] = useState<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({
    nombre_propietario: '',
    tipo_propiedad: '',
    es_arrendatario: false,
    nombre_arrendatario: '',
    celular: '',
    correo: '',
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setErrorMsg('No se pudo identificar al usuario.');
        return;
      }
      const { data: profile, error: profileErr } = await supabase
        .from('usuarios')
        .select('rol, casa_id')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        throw profileErr;
      }

      setUserRole(profile?.rol ?? 'residente');
      setUserCasaId(profile?.casa_id ?? null);
    } catch (err: any) {
      setErrorMsg('Error al cargar usuario: ' + err.message);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const fetchCasas = useCallback(async () => {
    try {
      setLoading(true);
      if (userRole === 'residente' && userCasaId === null) {
        setCasas([]);
        return;
      }

      const query = userRole === 'residente' && userCasaId !== null
        ? `/api/actualizacion-datos?casa_id=${userCasaId}`
        : '/api/actualizacion-datos';

      const res = await fetch(query);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error || 'Error al obtener datos');
      }
      const data = await res.json();
      const casasData = Array.isArray(data) ? data : [data];
      setCasas(casasData || []);
      if (userRole === 'residente' && casasData.length === 1) {
        setSelectedId(casasData[0].id);
        setForm({
          nombre_propietario: casasData[0].nombre_propietario || '',
          tipo_propiedad: casasData[0].tipo_propiedad || '',
          es_arrendatario: casasData[0].es_arrendatario || false,
          nombre_arrendatario: casasData[0].nombre_arrendatario || '',
          celular: casasData[0].celular || '',
          correo: casasData[0].correo || '',
        });
      }
    } catch (err: any) {
      setErrorMsg('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole, userCasaId]);

  useEffect(() => {
    async function init() {
      await fetchUserProfile();
    }
    init();
  }, [fetchUserProfile]);

  useEffect(() => {
    if (authReady) {
      fetchCasas();
    }
    setTimeout(() => setVisible(true), 50);
  }, [authReady, fetchCasas]);

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setErrorMsg(msg); setSuccessMsg(''); }
    else { setSuccessMsg(msg); setErrorMsg(''); }
    setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 3500);
  };

  const handleSelectCasa = (casa: Casa) => {
    setSelectedId(casa.id);
    setForm({
      nombre_propietario: casa.nombre_propietario || '',
      tipo_propiedad: casa.tipo_propiedad || '',
      es_arrendatario: casa.es_arrendatario || false,
      nombre_arrendatario: casa.nombre_arrendatario || '',
      celular: casa.celular || '',
      correo: casa.correo || '',
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const exportarExcel = async () => {
    try {
      setExporting(true);
      const ExcelJS = (await import('exceljs')).default;
      const fileSaver = await import('file-saver');
      const saveAs = fileSaver.saveAs || (fileSaver as any).default?.saveAs;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Actualización de Datos');

      worksheet.columns = [
        { key: 'casa', width: 18 },
        { key: 'tipo', width: 16 },
        { key: 'arrendatario', width: 14 },
        { key: 'propietario', width: 30 },
        { key: 'nombre_arrendatario', width: 30 },
        { key: 'celular', width: 18 },
        { key: 'correo', width: 30 },
      ];

      worksheet.addRow([
        'Casa',
        'Tipo de propiedad',
        'Es arrendatario',
        'Nombre propietario',
        'Nombre arrendatario',
        'Celular',
        'Correo',
      ]);

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      casas.forEach((casa) => {
        worksheet.addRow({
          casa: `Casa ${casa.numero_casa}`,
          tipo: casa.tipo_propiedad || 'N/A',
          arrendatario: casa.es_arrendatario ? 'Sí' : 'No',
          propietario: casa.nombre_propietario || '',
          nombre_arrendatario: casa.nombre_arrendatario || '',
          celular: casa.celular || '',
          correo: casa.correo || '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Actualizacion_Datos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      notify('No se pudo generar el Excel.', true);
    } finally {
      setExporting(false);
    }
  };

  const handleUpdateField = async (casaId: number, field: string, value: any) => {
    setSavingId(casaId);
    try {
      const res = await fetch('/api/actualizacion-datos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casa_id: casaId, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error en la operaci\u00f3n');
      await fetchCasas();
      if (selectedId === casaId) {
        setForm(prev => ({ ...prev, [field]: value }));
      }
      notify(data.message || 'Dato actualizado correctamente.');
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    } finally {
      setSavingId(null);
    }
  };

  const handleFullSave = async () => {
    if (!selectedId) return;
    setSavingId(selectedId);
    try {
      const res = await fetch('/api/actualizacion-datos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casa_id: selectedId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error en la operaci\u00f3n');
      await fetchCasas();
      notify(data.message || 'Datos guardados correctamente.');
    } catch (err: any) {
      notify('Error: ' + err.message, true);
    } finally {
      setSavingId(null);
    }
  };

  const handleBlur = (field: string, currentValue: any, originalValue: any) => {
    setFocusedField(null);
    if (selectedId && currentValue !== (originalValue || '')) {
      handleUpdateField(selectedId, field, currentValue);
    }
  };

  const selectedCasa = casas.find(c => c.id === selectedId);
  const canExportExcel = userRole === 'admin';

  return (
    <div style={{
      padding: '2.5rem',
      fontFamily: 'inherit',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>

      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Propietarios</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
          Actualizacion <span style={{ color: ACCENT }}>Datos</span>
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.05em' }}>
          Gestiona la informacion de contacto de propietarios y arrendatarios
        </p>
      </div>

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

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

        <div style={{ flex: '1 1 350px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}40, transparent)` }} />
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Unidades</p>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>CASAS / LOTES</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {!loading && <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{casas.length} registros</span>}
              {canExportExcel && (
                <button
                  onClick={exportarExcel}
                  disabled={loading || exporting}
                  style={{
                    background: exporting ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: loading || exporting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    borderRadius: '0.5rem',
                    fontFamily: 'inherit',
                  }}
                >
                  {exporting ? 'Generando...' : 'Exportar Excel'}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
              <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
            </div>
          ) : casas.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.25)', fontSize: '0.8rem' }}>
              Sin registros
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {casas.map((casa, i) => {
                const isSelected = selectedId === casa.id;
                const isHov = hoveredRow === casa.id && !isSelected;
                const hasData = casa.nombre_propietario || casa.celular || casa.correo;
                return (
                  <button
                    key={casa.id}
                    onClick={() => handleSelectCasa(casa)}
                    onMouseEnter={() => setHoveredRow(casa.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer',
                      padding: '0.85rem 1.5rem',
                      background: isSelected ? `${ACCENT}12` : isHov ? `${ACCENT}07` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                      borderLeft: isSelected ? `3px solid ${ACCENT}` : '3px solid transparent',
                      borderBottom: i < casas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                        {casa.tipo_propiedad ? `${casa.tipo_propiedad} ` : ''}{casa.numero_casa}
                      </div>
                      {casa.nombre_propietario ? (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                          {casa.nombre_propietario}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.15rem' }}>Sin datos</div>
                      )}
                    </div>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: hasData ? '#4ade80' : 'rgba(255,255,255,0.15)',
                      boxShadow: hasData ? '0 0 6px #4ade80' : 'none',
                      flexShrink: 0,
                    }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 450px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}60, transparent)` }} />

          {!selectedCasa ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.15 }}>◈</div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                Selecciona una casa o lote del panel izquierdo<br />para actualizar sus datos
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Editando</p>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {selectedCasa.tipo_propiedad ? `${selectedCasa.tipo_propiedad} ` : ''}{selectedCasa.numero_casa}
                  </h2>
                </div>
                <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', border: `1px solid ${ACCENT}40`, color: ACCENT, letterSpacing: '0.1em' }}>
                  ID: {selectedCasa.id}
                </span>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Tipo de propiedad
                    </label>
                    <select
                      value={form.tipo_propiedad}
                      onChange={e => setForm(prev => ({ ...prev, tipo_propiedad: e.target.value }))}
                      onFocus={() => setFocusedField('tipo_propiedad')}
                      onBlur={() => handleBlur('tipo_propiedad', form.tipo_propiedad, selectedCasa?.tipo_propiedad)}
                      style={{ ...inputStyle(focusedField === 'tipo_propiedad'), appearance: 'none' as const }}
                    >
                      <option value="" style={{ background: '#0a0a0f' }}>— Seleccionar —</option>
                      <option value="Casa" style={{ background: '#0a0a0f' }}>Casa</option>
                      <option value="Lote" style={{ background: '#0a0a0f' }}>Lote</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      ¿Es arrendatario?
                    </label>
                    <select
                      value={form.es_arrendatario ? 'si' : 'no'}
                      onChange={e => setForm(prev => ({ ...prev, es_arrendatario: e.target.value === 'si' }))}
                      onFocus={() => setFocusedField('es_arrendatario')}
                      onBlur={() => handleBlur('es_arrendatario', form.es_arrendatario, selectedCasa?.es_arrendatario)}
                      style={{ ...inputStyle(focusedField === 'es_arrendatario'), appearance: 'none' as const }}
                    >
                      <option value="no" style={{ background: '#0a0a0f' }}>No</option>
                      <option value="si" style={{ background: '#0a0a0f' }}>Si</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                    Nombre del propietario
                  </label>
                  <input
                    type="text"
                    value={form.nombre_propietario}
                    onChange={e => setForm(prev => ({ ...prev, nombre_propietario: e.target.value }))}
                    onFocus={() => setFocusedField('nombre_propietario')}
                    onBlur={() => handleBlur('nombre_propietario', form.nombre_propietario, selectedCasa?.nombre_propietario)}
                    style={inputStyle(focusedField === 'nombre_propietario')}
                    placeholder="Nombre completo del propietario"
                  />
                </div>

                {form.es_arrendatario && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Nombre del arrendatario
                    </label>
                    <input
                      type="text"
                      value={form.nombre_arrendatario}
                      onChange={e => setForm(prev => ({ ...prev, nombre_arrendatario: e.target.value }))}
                      onFocus={() => setFocusedField('nombre_arrendatario')}
                      onBlur={() => handleBlur('nombre_arrendatario', form.nombre_arrendatario, selectedCasa?.nombre_arrendatario)}
                      style={inputStyle(focusedField === 'nombre_arrendatario')}
                      placeholder="Nombre del arrendatario"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Celular <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.celular}
                      onChange={e => setForm(prev => ({ ...prev, celular: e.target.value }))}
                      onFocus={() => setFocusedField('celular')}
                      onBlur={() => handleBlur('celular', form.celular, selectedCasa?.celular)}
                      style={inputStyle(focusedField === 'celular')}
                      placeholder="300 123 4567"
                    />
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label style={{ display: 'block', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
                      Correo <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={form.correo}
                      onChange={e => setForm(prev => ({ ...prev, correo: e.target.value }))}
                      onFocus={() => setFocusedField('correo')}
                      onBlur={() => handleBlur('correo', form.correo, selectedCasa?.correo)}
                      style={inputStyle(focusedField === 'correo')}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleFullSave}
                    disabled={savingId !== null}
                    style={{
                      background: savingId !== null ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
                      border: `1px solid ${savingId !== null ? 'rgba(255,255,255,0.08)' : ACCENT + '50'}`,
                      color: savingId !== null ? 'rgba(255,255,255,0.3)' : ACCENT,
                      padding: '0.65rem 2rem', fontSize: '0.72rem', letterSpacing: '0.12em',
                      cursor: savingId !== null ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                    onMouseEnter={e => { if (!savingId) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}35, ${ACCENT}18)`; }}
                    onMouseLeave={e => { if (!savingId) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`; }}
                  >
                    {savingId !== null
                      ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Guardando...</>
                      : '→ GUARDAR TODO'
                    }
                  </button>
                </div>

                <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', margin: 0, letterSpacing: '0.05em' }}>
                  Los campos se guardan individualmente al salir del campo. El bot\u00f3n guarda todo de una vez.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        ::placeholder { color: rgba(255,255,255,0.18) !important; }
      `}</style>
    </div>
  );
}
