'use client';

import { useState, useEffect } from 'react';
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
  hora_retorno: string;
  tipo_duracion: 'medio_dia' | 'un_dia';
  motivo: string;
  categoria: 'personal' | 'salud';
  estado: 'pendiente' | 'aprobado' | 'rechazado';
};

export default function PermisosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [history, setHistory] = useState<Permit[]>([]);
  const [visible, setVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horas: '',
    hora_salida: '',
    hora_retorno: '',
    tipo_duracion: 'medio_dia' as 'medio_dia' | 'un_dia',
    motivo: '',
    categoria: 'personal' as 'personal' | 'salud',
    intent_retorno: 'si'
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

      // Admin ve todos los permisos, trabajador/residente solo los suyos
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
        finalData.hora_retorno = 'SIN RETORNO';
      }

      const { error } = await supabase
        .from('permisos')
        .insert([{
          usuario_id: user?.id,
          nombre_completo: userProfile?.nombre_completo,
          cargo: userProfile?.cargo,
          fecha: finalData.fecha,
          horas: finalData.horas,
          hora_salida: finalData.hora_salida,
          hora_retorno: finalData.hora_retorno,
          tipo_duracion: finalData.tipo_duracion,
          motivo: finalData.motivo,
          categoria: finalData.categoria
        }])
        .select()
        .single();

      if (error) throw error;
      
      setShowForm(false);
      loadData();
    } catch (err) {
      alert('Error al guardar el permiso');
      console.error(err);
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
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const generatePDF = async (permit: Permit) => {
    const doc = new jsPDF();
    
    // Configuración de fuentes y colores (Premium)
    const primaryColor = '#1e293b';
    const accentColor = '#60a5fa';

    // Logo del condominio
    try {
      const response = await fetch('/logo.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise<void>(resolve => {
        reader.onloadend = () => {
          try {
            doc.addImage(reader.result as string, 'PNG', 15, 10, 30, 30);
          } catch { /* Si falla la imagen, continuar */ }
          resolve();
        };
      });
    } catch {
      // Si no carga la imagen, solo mostramos texto
    }

    // Encabezado
    doc.setFontSize(10);
    doc.setTextColor(primaryColor);
    doc.text('CONDOMINIO CAMPESTRE LA FLORIDA', 105, 20, { align: 'center' });
    doc.text('NIT 900.588.163 - 1', 105, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMATO DE PERMISO', 105, 40, { align: 'center' });

    // Campos del formulario (Simulando el formato manuscrito)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const startY = 55;
    const lineHeight = 10;

    const drawField = (label: string, value: string, y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '_______________________', 65, y);
      doc.line(65, y + 1, 185, y + 1); // Línea simulada
    };

    drawField('NOMBRES Y APELLIDOS', permit.nombre_completo, startY);
    drawField('CARGO', permit.cargo, startY + lineHeight);
    drawField('FECHA', permit.fecha, startY + lineHeight * 2);
    drawField('HORAS', permit.horas, startY + lineHeight * 3);
    drawField('HORA SALIDA', permit.hora_salida, startY + lineHeight * 4);
    drawField('HORA RETORNO', permit.hora_retorno || 'SIN RETORNO', startY + lineHeight * 5);
    
    // Duración Checks
    doc.setFont('helvetica', 'bold');
    doc.text('DURACIÓN:', 20, startY + lineHeight * 6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`[${permit.tipo_duracion === 'medio_dia' ? 'X' : ' '}] MEDIO DÍA`, 65, startY + lineHeight * 6.5);
    doc.text(`[${permit.tipo_duracion === 'un_dia' ? 'X' : ' '}] UN DÍA`, 110, startY + lineHeight * 6.5);

    // Motivo
    doc.setFont('helvetica', 'bold');
    doc.text('MOTIVO:', 20, startY + lineHeight * 8);
    doc.setFont('helvetica', 'normal');
    doc.rect(20, startY + lineHeight * 8 + 3, 170, 30);
    doc.text(doc.splitTextToSize(permit.motivo || '', 160), 25, startY + lineHeight * 8 + 10);

    // Categoria
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO:', 20, startY + lineHeight * 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`[${permit.categoria === 'personal' ? 'X' : ' '}] PERSONAL`, 65, startY + lineHeight * 12);
    doc.text(`[${permit.categoria === 'salud' ? 'X' : ' '}] SALUD`, 110, startY + lineHeight * 12);

    // Firmas
    const footerY = 240;
    doc.line(20, footerY, 80, footerY);
    doc.text('FIRMA PERSONAL', 20, footerY + 5);
    
    doc.line(120, footerY, 180, footerY);
    doc.text('V.B. ADMINISTRADORA', 120, footerY + 5);

    doc.save(`Permiso_${permit.nombre_completo}_${permit.fecha}.pdf`);
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
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Gestión de Personal</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              Formato de <span style={{ color: '#a78bfa' }}>Permisos</span>
            </h1>
          </div>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{
              background: '#a78bfa', color: '#fff', border: 'none', padding: '0.8rem 1.5rem',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em',
              textTransform: 'uppercase', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem'
            }}
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
          <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} style={{ color: '#a78bfa' }} /> Nueva Solicitud
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Fecha de la Falta</label>
              <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} style={inputStyle} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Cantidad de Horas</label>
              <input type="text" placeholder="Ej: 4 horas" value={formData.horas} onChange={e => setFormData({...formData, horas: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hora Salida</label>
              <input type="time" value={formData.hora_salida} onChange={e => setFormData({...formData, hora_salida: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>¿Retorna?</label>
              <select value={formData.intent_retorno} onChange={e => setFormData({...formData, intent_retorno: e.target.value})} style={selectStyle}>
                <option value="si" style={{ background: '#0a0a0f' }}>SÍ</option>
                <option value="no" style={{ background: '#0a0a0f' }}>NO</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: formData.intent_retorno === 'si' ? 1 : 0.4, pointerEvents: formData.intent_retorno === 'si' ? 'auto' : 'none' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hora Retorno</label>
              <input type="time" disabled={formData.intent_retorno === 'no'} value={formData.hora_retorno} onChange={e => setFormData({...formData, hora_retorno: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Duración</label>
              <select value={formData.tipo_duracion} onChange={e => setFormData({...formData, tipo_duracion: e.target.value as any})} style={selectStyle}>
                <option value="medio_dia" style={{ background: '#0a0a0f' }}>Medio día</option>
                <option value="un_dia" style={{ background: '#0a0a0f' }}>Un día</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Categoría</label>
              <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value as any})} style={selectStyle}>
                <option value="personal" style={{ background: '#0a0a0f' }}>Asunto Personal</option>
                <option value="salud" style={{ background: '#0a0a0f' }}>Salud / Médica</option>
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Motivo Detallado</label>
              <textarea rows={4} required value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} style={inputStyle} />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" disabled={saving} style={{ 
                flex: 1, background: '#a78bfa', color: '#fff', border: 'none', padding: '1rem', 
                fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' 
              }}>
                {saving ? 'Guardando...' : 'Enviar Solicitud'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ 
                background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', 
                padding: '1rem 2rem', cursor: 'pointer' 
              }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={18} style={{ color: '#a78bfa' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0 }}>HISTORIAL DE SOLICITUDES</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={thStyle}>Fecha</th>
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
                    <span style={{ 
                      fontSize: '0.65rem', padding: '0.2rem 0.5rem', 
                      background: permit.categoria === 'salud' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)',
                      color: permit.categoria === 'salud' ? '#60a5fa' : '#a78bfa',
                      border: `1px solid ${permit.categoria === 'salud' ? '#60a5fa20' : '#a78bfa20'}`
                    }}>
                      {permit.categoria === 'salud' ? 'Salud' : 'Personal'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{permit.motivo}</td>
                  <td style={tdStyle}>
                    {permit.estado === 'aprobado' ? <CheckCircle2 size={16} color="#4ade80" /> : permit.estado === 'rechazado' ? <XCircle size={16} color="#f87171" /> : <Clock size={16} color="#fbbf24" />}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => generatePDF(permit)}
                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                      >
                        <Download size={14} /> PDF
                      </button>
                      {userProfile?.rol === 'admin' && (
                        <button 
                          onClick={() => handleDelete(permit.id)}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}
                        >
                          <XCircle size={14} /> Borrar
                        </button>
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
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '0.8rem',
  color: '#fff',
  fontSize: '0.85rem',
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
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em'
};

const tdStyle: React.CSSProperties = {
  padding: '1rem',
  color: '#fff',
  fontSize: '0.82rem'
};
