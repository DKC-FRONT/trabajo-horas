'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FileText, Download, Plus, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type Permit = {
  id: number;
  nombre_completo: string;
  cargo: string;
  fecha: string;
  horas: string;
  hora_salida: string;
  hora_retorno: string | null;
  tipo_duracion: 'medio_dia' | 'un_dia';
  motivo: string;
  categoria: 'personal' | 'salud';
  estado: 'pendiente' | 'aprobado' | 'rechazado';
};

type Trabajador = {
  id: string;
  nombre_completo: string;
};

export default function PermisosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [history, setHistory] = useState<Permit[]>([]);
  const [visible, setVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horas: '',
    hora_salida: '',
    hora_retorno: '',
    tipo_duracion: 'medio_dia' as 'medio_dia' | 'un_dia',
    motivo: '',
    categoria: 'personal' as 'personal' | 'salud',
    intent_retorno: 'si',
    cargo: '',
    trabajador_id: ''
  });

  useEffect(() => {
    loadData();
    setTimeout(() => setVisible(true), 50);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      if (profile?.rol === 'admin') {
        const { data: users } = await supabase
          .from('usuarios')
          .select('id, nombre_completo')
          .in('rol', ['trabajador', 'admin']);
        setTrabajadores(users || []);
      }

      const permisosQuery = supabase
        .from('permisos')
        .select('*')
        .order('creado_el', { ascending: false });

      const finalQuery = profile?.rol === 'admin'
        ? permisosQuery
        : permisosQuery.eq('usuario_id', user.id);

      const { data: permits } = await finalQuery;
      setHistory(permits || []);
    } catch (err) {
      console.error('Error loading permits:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAMPM = (time: string | null) => {
    if (!time || time === 'SIN RETORNO') return 'SIN RETORNO';
    const [hours, minutes] = time.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Ajustar hora_retorno si dice que no retorna
      const finalData = { ...formData };
      if (formData.intent_retorno === 'no') {
        finalData.hora_retorno = null as any;
      }

      const insertData = {
        usuario_id: (userProfile?.rol === 'admin' && formData.trabajador_id) ? formData.trabajador_id : user?.id,
        nombre_completo: (userProfile?.rol === 'admin' && formData.trabajador_id) 
          ? trabajadores.find(t => t.id === formData.trabajador_id)?.nombre_completo 
          : userProfile?.nombre_completo,
        cargo: formData.cargo || userProfile?.cargo,
        fecha: finalData.fecha,
        horas: finalData.horas,
        hora_salida: finalData.hora_salida,
        hora_retorno: finalData.hora_retorno,
        tipo_duracion: finalData.tipo_duracion,
        motivo: finalData.motivo,
        categoria: finalData.categoria
      };

      console.log('Inserting permit data:', insertData);

      const { error } = await supabase
        .from('permisos')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      
      setShowForm(false);
      loadData();
    } catch (err: any) {
      alert(`Error al guardar el permiso: ${err.message || 'Error desconocido'}`);
      console.error('Full Error Object:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este permiso?')) return;
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.from('permisos').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch {
      alert('Error al eliminar');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'aprobado' | 'rechazado') => {
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('permisos')
        .update({ estado: status })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (err) {
      alert('Error al actualizar estado');
      console.error(err);
    }
  };

  const generatePDF = async (permit: Permit) => {
    const doc = new jsPDF();
    const primaryColor = '#1e293b';
    const secondaryColor = '#64748b';
    const accentColor = '#334155';

    // Logo del condominio
    try {
      const response = await fetch('/logo_florida.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise<void>(resolve => {
        reader.onloadend = () => {
          try {
            // Dimensiones para un logo horizontal
            doc.addImage(reader.result as string, 'PNG', 15, 12, 65, 20);
          } catch { /* continuar */ }
          resolve();
        };
      });
    } catch { }

    // Encabezado Formal
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDOMINIO CAMPESTRE LA FLORIDA', 135, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('NIT 900.588.163 - 1', 135, 27, { align: 'center' });
    doc.text('Documento Interno de Control de Personal', 135, 32, { align: 'center' });
    
    // Título con línea decorativa
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 45, 195, 45);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO ÚNICO DE PERMISO LABORAL', 105, 55, { align: 'center' });
    doc.line(15, 60, 195, 60);

    // Grid de Datos
    doc.setFontSize(10);
    const startY = 75;
    const col1 = 20;
    const col2 = 70;
    const rowH = 10;

    const drawRow = (label: string, value: string, y: number, isLast = false) => {
      // Fondo sutil para la etiqueta
      doc.setFillColor(248, 250, 252);
      doc.rect(col1 - 2, y - 6, 48, rowH, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor);
      doc.text(label, col1, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(primaryColor);
      doc.text(value || 'N/A', col2, y);
      
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(col1 - 2, y + 3, 190, y + 3);
    };

    drawRow('NOMBRES Y APELLIDOS', permit.nombre_completo.toUpperCase(), startY);
    drawRow('CARGO / FUNCIÓN', (permit.cargo || 'NO ASIGNADO').toUpperCase(), startY + rowH);
    drawRow('FECHA SOLICITADA', permit.fecha, startY + rowH * 2);
    drawRow('DURACIÓN ESTIMADA', permit.horas, startY + rowH * 3);
    drawRow('HORA DE SALIDA', formatAMPM(permit.hora_salida), startY + rowH * 4);
    drawRow('HORA DE RETORNO', formatAMPM(permit.hora_retorno), startY + rowH * 5);

    // Sección de Opciones (Checkbox Profesionales)
    const optionsY = startY + rowH * 7;
    
    // Duración
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE DURACIÓN:', col1, optionsY);
    doc.setFont('helvetica', 'normal');
    
    // Checkboxes
    const drawCheck = (x: number, y: number, label: string, checked: boolean) => {
      doc.setDrawColor(primaryColor);
      doc.rect(x, y - 4, 4, 4);
      if (checked) {
        doc.setFont('helvetica', 'bold');
        doc.text('X', x + 1, y - 1);
      }
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + 7, y - 1);
    };

    drawCheck(70, optionsY, 'MEDIO DÍA', permit.tipo_duracion === 'medio_dia');
    drawCheck(125, optionsY, 'UN DÍA COMPLETO', permit.tipo_duracion === 'un_dia');

    // Categoría
    const catY = optionsY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO DEL PERMISO:', col1, catY);
    drawCheck(70, catY, 'ASUNTO PERSONAL', permit.categoria === 'personal');
    drawCheck(125, catY, 'SALUD / MÉDICA', permit.categoria === 'salud');

    // Motivo Caja
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DEL MOTIVO:', col1, catY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(20, catY + 16, 170, 35);
    const splitMotivo = doc.splitTextToSize(permit.motivo || 'Sin descripción detallada.', 160);
    doc.text(splitMotivo, 25, catY + 23);

    // Firmas
    const footerY = 245;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    
    doc.line(25, footerY, 85, footerY);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DEL SOLICITANTE', 55, footerY + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(permit.nombre_completo, 55, footerY + 11, { align: 'center' });

    doc.setFontSize(10);
    doc.line(125, footerY, 185, footerY);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTORIZACIÓN ADMIN.', 155, footerY + 6, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('GERENCIA / RRHH', 155, footerY + 11, { align: 'center' });

    // Pie de página
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor);
    const now = new Date().toLocaleString();
    doc.text(`Generado electrónicamente el: ${now} - UrbanFlowRS Security Module`, 105, 285, { align: 'center' });

    doc.save(`Permiso_${permit.nombre_completo.replace(' ', '_')}_${permit.fecha}.pdf`);
  };

  return (
    <div style={{
      padding: '2.5rem',
      maxWidth: '1200px',
      margin: '0 auto',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.6s ease',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Image src="/logo_florida.png" alt="Logo" width={160} height={50} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.9rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Gestión de Personal</p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', fontWeight: 700, color: '#fdf5e6', letterSpacing: '-0.02em', margin: 0 }}>
              Formato de <span style={{ color: '#a78bfa' }}>Permisos</span>
            </h1>
          </div>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{
              background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)',
              color: '#a78bfa', padding: '0.6rem 1.2rem', fontSize: '1.13rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 'bold', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.25)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.15)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={16} /> Solicitar Permiso
          </button>
        )}
      </div>

      {showForm ? (
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '2.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <h2 style={{ fontSize: '1.8rem', color: '#fdf5e6', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} style={{ color: '#a78bfa' }} /> Nueva Solicitud
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {userProfile?.rol === 'admin' && (
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Escoger Trabajador</label>
                <select required value={formData.trabajador_id} onChange={e => setFormData({...formData, trabajador_id: e.target.value})} style={selectStyle}>
                  <option value="" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>-- Seleccionar Empleado --</option>
                  {trabajadores.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#0a0a0f', color: '#fdf5e6' }}>{t.nombre_completo}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cargo / Función</label>
              <input type="text" placeholder="Ej: Vigilante, Jardinero..." value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Fecha de la Falta</label>
              <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} style={inputStyle} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cantidad de Horas</label>
              <input type="text" placeholder="Ej: 4 horas" value={formData.horas} onChange={e => setFormData({...formData, horas: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hora Salida</label>
              <input type="time" value={formData.hora_salida} onChange={e => setFormData({...formData, hora_salida: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>¿Retorna?</label>
              <select value={formData.intent_retorno} onChange={e => setFormData({...formData, intent_retorno: e.target.value})} style={selectStyle}>
                <option value="si" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>SÍ (Regresa hoy)</option>
                <option value="no" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>NO (No regresa hoy)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: formData.intent_retorno === 'si' ? 1 : 0.4, pointerEvents: formData.intent_retorno === 'si' ? 'auto' : 'none' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hora Retorno</label>
              <input type="time" disabled={formData.intent_retorno === 'no'} value={formData.hora_retorno} onChange={e => setFormData({...formData, hora_retorno: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Duración</label>
              <select value={formData.tipo_duracion} onChange={e => setFormData({...formData, tipo_duracion: e.target.value as any})} style={selectStyle}>
                <option value="medio_dia" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>Medio día</option>
                <option value="un_dia" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>Un día</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Categoría</label>
              <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value as any})} style={selectStyle}>
                <option value="personal" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>Asunto Personal</option>
                <option value="salud" style={{ background: '#0a0a0f', color: '#fdf5e6' }}>Salud / Médica</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Motivo Detallado</label>
              <textarea rows={4} required value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                type="submit" 
                disabled={saving} 
                style={{ 
                  flex: 1, 
                  background: saving ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.15)', 
                  border: saving ? '1px solid rgba(167,139,250,0.2)' : '1px solid rgba(167,139,250,0.4)', 
                  color: saving ? 'rgba(167,139,250,0.5)' : '#a78bfa', 
                  padding: '0.6rem 1.2rem', 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  fontFamily: 'inherit', 
                  letterSpacing: '0.1em', 
                  textTransform: 'uppercase', 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'rgba(167,139,250,0.25)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = 'rgba(167,139,250,0.15)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {saving ? 'Guardando...' : 'Enviar Solicitud'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                style={{ 
                  flex: 1,
                  background: 'rgba(248,113,113,0.15)', 
                  border: '1px solid rgba(248,113,113,0.4)', 
                  color: '#f87171', 
                  padding: '0.6rem 1.2rem', 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  fontFamily: 'inherit', 
                  letterSpacing: '0.1em', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={18} style={{ color: '#a78bfa' }} />
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fdf5e6', margin: 0 }}>HISTORIAL DE SOLICITUDES</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Solicitante</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={thStyle}>Motivo</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.map((permit) => (
                  <tr key={permit.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={tdStyle}>{permit.fecha}</td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '1.27rem', color: '#fdf5e6' }}>{permit.nombre_completo}</div>
                      <div style={{ fontSize: '0.98rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{permit.cargo}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        fontSize: '0.98rem', padding: '0.2rem 0.55rem', 
                        background: permit.categoria === 'salud' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)',
                        color: permit.categoria === 'salud' ? '#60a5fa' : '#a78bfa',
                        border: `1px solid ${permit.categoria === 'salud' ? '#60a5fa20' : '#a78bfa20'}`
                      }}>
                        {permit.categoria === 'salud' ? 'Salud' : 'Personal'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{permit.motivo}</td>
                    <td style={tdStyle}>
                      {permit.estado === 'aprobado' ? <CheckCircle2 size={16} color="#4ade80" /> : permit.estado === 'rechazado' ? <XCircle size={16} color="#f87171" /> : <Clock size={16} color="#fbbf24" />}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
                        <button 
                          onClick={() => generatePDF(permit)}
                          style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.13rem' }}
                        >
                          <Download size={14} /> PDF
                        </button>
                        {(userProfile?.rol === 'admin' || userProfile?.email === 'admin@florida.com') && (
                          <>
                            {permit.estado === 'pendiente' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateStatus(permit.id, 'aprobado')}
                                  style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.13rem', fontWeight: 600 }}
                                >
                                  <CheckCircle2 size={14} /> Aprobar
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(permit.id, 'rechazado')}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.13rem', fontWeight: 600 }}
                                >
                                  <XCircle size={14} /> Rechazar
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDelete(permit.id)}
                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.13rem' }}
                            >
                              <XCircle size={14} /> Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No tienes solicitudes registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '0.8rem',
  color: '#fdf5e6',
  fontSize: '1.27rem',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  colorScheme: 'dark',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.8rem center',
  paddingRight: '2.5rem',
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'left',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em'
};

const tdStyle: React.CSSProperties = {
  padding: '1rem',
  color: '#fdf5e6',
  fontSize: '1.23rem'
};
