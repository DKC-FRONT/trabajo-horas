'use client';

import { useState, useEffect } from 'react';
import { Play, Square, History, Activity } from 'lucide-react';

type AttendanceRecord = {
  id: number;
  hora_entrada: string;
  hora_salida: string | null;
  total_horas: number | null;
};

export default function AsistenciaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estados para Admin
  const [userRole, setUserRole] = useState<string>('residente');
  const [employees, setEmployees] = useState<{id: string, nombre_completo: string}[]>([]);
  const [adminHistory, setAdminHistory] = useState<any[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  
  // Filtros temporales
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([new Date().getFullYear()]);
  const [stats, setStats] = useState({ promedio: 0, total: 0 });

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setTimeout(() => setVisible(true), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAdminData();
      fetchAniosDisponibles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, filterEmployee, mesSeleccionado, anioSeleccionado]);

  const fetchAniosDisponibles = async () => {
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data } = await supabase.from('asistencia').select('hora_entrada');
      const years = new Set<number>();
      years.add(new Date().getFullYear());
      (data || []).forEach((r: any) => years.add(new Date(r.hora_entrada).getFullYear()));
      setAniosDisponibles(Array.from(years).sort((a, b) => a - b));
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Obtener rol y verificar super-admin
      const { data: profile } = await supabase.from('usuarios').select('rol, email').eq('id', user.id).single();
      if (profile) {
        setUserRole(profile.rol);
        // Todos los admins pueden editar registros
        setIsSuperAdmin(profile.rol === 'admin');
      }

      // Buscar registro activo del usuario actual
      const { data: active } = await supabase
        .from('asistencia')
        .select('*')
        .eq('usuario_id', user.id)
        .is('hora_salida', null)
        .order('hora_entrada', { ascending: false })
        .limit(1)
        .maybeSingle();

      setActiveRecord(active || null);

      // Cargar historial reciente del usuario actual
      const { data: past } = await supabase
        .from('asistencia')
        .select('*')
        .eq('usuario_id', user.id)
        .not('hora_salida', 'is', null)
        .order('hora_entrada', { ascending: false })
        .limit(5);

      setHistory(past || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = dom, 1 = lun ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  const fetchAdminData = async () => {
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      // 1. Obtener lista de empleados/admins
      const { data: users } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .in('rol', ['admin', 'trabajador'])
        .order('nombre_completo');
      setEmployees(users || []);

      let startDate: string;
      let endDate: string;

      if (filterEmployee === 'all') {
        // Vista por defecto: solo esta semana (lun–dom)
        const { start, end } = getWeekRange();
        startDate = start.toISOString();
        endDate   = end.toISOString();
      } else {
        // Vista por empleado: mes completo seleccionado
        startDate = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01T00:00:00`;
        endDate   = new Date(anioSeleccionado, mesSeleccionado, 0).toISOString().split('T')[0] + 'T23:59:59';
      }

      let query = supabase
        .from('asistencia')
        .select('*')
        .gte('hora_entrada', startDate)
        .lte('hora_entrada', endDate)
        .order('hora_entrada', { ascending: false });

      if (filterEmployee !== 'all') {
        query = query.eq('usuario_id', filterEmployee);
      }

      const { data: records } = await query;
      
      // Calcular estadísticas
      const validRecords = (records || []).filter((r: any) => r.total_horas !== null);
      const total = validRecords.reduce((s: number, r: any) => s + (Number(r.total_horas) || 0), 0);
      const promedio = validRecords.length > 0 ? total / validRecords.length : 0;
      setStats({ total, promedio });
      
      // Cruzar con nombres
      const mapped = (records || []).map((r: any) => {
        const u = (users || []).find((user: any) => user.id === r.usuario_id);
        return { ...r, nombre_completo: u ? u.nombre_completo : 'Usuario desconocido' };
      });

      setAdminHistory(mapped);

    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('¿Eliminar este registro de asistencia? No se puede deshacer.')) return;
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.from('asistencia').delete().eq('id', id);
      if (error) throw error;
      fetchAdminData();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const entry = new Date(editingRecord.hora_entrada);
      const exit = editingRecord.hora_salida ? new Date(editingRecord.hora_salida) : null;
      let total = null;
      
      if (exit) {
        const diffMs = exit.getTime() - entry.getTime();
        total = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      const { error } = await supabase
        .from('asistencia')
        .update({ 
          hora_entrada: entry.toISOString(),
          hora_salida: exit ? exit.toISOString() : null,
          total_horas: total 
        })
        .eq('id', editingRecord.id);

      if (error) throw error;
      setEditingRecord(null);
      fetchAdminData();
    } catch (err) {
      alert('Error al actualizar registro');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEntry = async () => {
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('asistencia')
        .insert([{ usuario_id: user?.id, hora_entrada: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;
      setActiveRecord(data);
      fetchAdminData();
    } catch (err) {
      alert('Error al marcar entrada');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExit = async () => {
    if (!activeRecord) return;
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const entryTime = new Date(activeRecord.hora_entrada);
      const exitTime = new Date();
      const diffMs = exitTime.getTime() - entryTime.getTime();
      const diffHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

      const { error } = await supabase
        .from('asistencia')
        .update({ 
          hora_salida: exitTime.toISOString(),
          total_horas: diffHrs 
        })
        .eq('id', activeRecord.id);

      if (error) throw error;
      setActiveRecord(null);
      fetchStatus();
      fetchAdminData();
    } catch (err) {
      alert('Error al marcar salida');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
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
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#fff', fontFamily: 'inherit' }}>
          Cargando sistema de asistencia...
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Operatividad</p>
              <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                Registro de <span style={{ color: '#60a5fa' }}>Asistencia</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Control horario de entrada y salida del personal.</p>
            </div>
            
            {userRole === 'admin' && (
              <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', flexShrink: 0 }}>
                <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>● MODO ADMINISTRADOR</span>
              </div>
            )}
          </div>

      <div style={{ display: 'grid', gridTemplateColumns: userRole === 'admin' ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
        
        {/* Sección Personal (Entrada/Salida) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '2.5rem',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: activeRecord ? '#4ade80' : '#60a5fa' }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem', fontFamily: 'inherit' }}>
              {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem', marginBottom: '2rem' }}>
              {currentTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {!activeRecord ? (
                <button onClick={handleEntry} disabled={saving} style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa', padding: '0.8rem 2rem', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.25)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.15)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <Play size={18} fill="currentColor" /> {saving ? '...' : 'MARCAR ENTRADA'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#4ade80', fontSize: '0.6rem', textTransform: 'uppercase', margin: 0 }}>En turno desde</p>
                    <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{formatTime(activeRecord.hora_entrada)}</p>
                  </div>
                  <button onClick={handleExit} disabled={saving} style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.8rem 2rem', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <Square size={18} fill="currentColor" /> {saving ? '...' : 'MARCAR SALIDA'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Administrador (Solo Admin) */}
          {userRole === 'admin' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={18} style={{ color: '#a78bfa' }} />
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0 }}>SEGUIMIENTO DE PERSONAL</h3>
                    {filterEmployee === 'all' ? (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: '#60a5fa', letterSpacing: '0.05em' }}>
                        📅 Vista: <strong>esta semana</strong> —
                        {' '}{getWeekRange().start.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        {' → '}
                        {getWeekRange().end.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </p>
                    ) : (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: '#fbbf24', letterSpacing: '0.05em' }}>
                        📋 Vista: <strong>mes completo</strong> ({['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mesSeleccionado - 1]} {anioSeleccionado})
                      </p>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Filtros mes/año: solo visibles cuando hay empleado seleccionado */}
                  {filterEmployee !== 'all' && (
                    <>
                      <select 
                        value={mesSeleccionado} 
                        onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.6rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
                      >
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>

                      <select 
                        value={anioSeleccionado} 
                        onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.6rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
                      >
                        {aniosDisponibles.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <select 
                    value={filterEmployee} 
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">📅 Esta semana (todos)</option>
                    {employees.map((e: any) => <option key={e.id} value={e.id}>{e.nombre_completo}</option>)}
                  </select>
                </div>
              </div>

              {/* Stats Bar */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Horas</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>{stats.total.toFixed(1)}h</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promedio por Turno</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa' }}>{stats.promedio.toFixed(1)}h</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registros</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>{adminHistory.length}</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={thStyle}>Empleado</th>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Entrada</th>
                        <th style={thStyle}>Salida</th>
                        <th style={{...thStyle, textAlign: 'right'}}>Horas</th>
                        <th style={{...thStyle, textAlign: 'right'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminHistory.map((record, i) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.005)' }}>
                        <td style={{ padding: '0.9rem 1.5rem', color: '#a78bfa', fontSize: '0.8rem', fontWeight: 600 }}>{record.nombre_completo}</td>
                        <td style={{ padding: '0.9rem 1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{formatDate(record.hora_entrada)}</td>
                        <td style={{ padding: '0.9rem 1.5rem', color: '#fff', fontSize: '0.8rem' }}>{formatTime(record.hora_entrada)}</td>
                        <td style={{ padding: '0.9rem 1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{record.hora_salida ? formatTime(record.hora_salida) : '--:--'}</td>
                        <td style={{ padding: '0.9rem 1.5rem', textAlign: 'right', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700 }}>{record.total_horas || 0}h</td>
                        <td style={{ padding: '0.9rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            {isSuperAdmin && (
                              <button 
                                onClick={() => setEditingRecord({...record})}
                                style={{ background: 'transparent', border: '1px solid rgba(251,191,36,0.25)', color: 'rgba(251,191,36,0.6)', padding: '0.25rem 0.6rem', fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.borderColor = '#fbbf24'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(251,191,36,0.6)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; }}
                              >
                                EDITAR
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              title="Eliminar registro"
                              style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.6)', padding: '0.25rem 0.6rem', fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#f87171'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adminHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>No se encontraron registros activos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Columna Lateral (Info y Normativa) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', padding: '1.5rem' }}>
            <Activity size={20} style={{ color: '#60a5fa', marginBottom: '1rem' }} />
            <h4 style={{ color: '#fff', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Estado del Sistema</h4>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', lineHeight: 1.6 }}>El registro de asistencia se valida mediante el servidor de Supabase. Asegúrate de tener una conexión estable al marcar tus tiempos.</p>
          </div>
          
          <div style={{ padding: '0 1rem' }}>
            <h4 style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Normativa</h4>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                'Registro obligatorio al inicio y fin.',
                'Validación automática de horas.',
                'Reportar incidencias al Admin.'
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ color: '#60a5fa' }}>•</span> {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Historial Propio Recortado (Solo si no es admin o para recordatorio rápido) */}
          {history.length > 0 && (
             <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={16} style={{ color: '#60a5fa' }} />
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', margin: 0 }}>MIS ÚLTIMOS TURNOS</h3>
              </div>
              <div style={{ padding: '0.5rem' }}>
                {history.map((r: any) => (
                  <div key={r.id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{formatDate(r.hora_entrada)}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#fff' }}>{formatTime(r.hora_entrada)} - {r.hora_salida ? formatTime(r.hora_salida) : '...'}</p>
                    </div>
                    <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>{r.total_horas}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
      {/* Modal de Edición */}
      {editingRecord && (
        <div
          onClick={() => setEditingRecord(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '2rem 1rem 4rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.12)',
              padding: '2rem', width: '100%', maxWidth: '480px',
              position: 'relative', flexShrink: 0,
            }}
          >
            {/* Barra de color superior */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(to right, #fbbf24, transparent)' }} />

            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Admin</p>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontFamily: 'inherit' }}>Modificar Asistencia</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0.3rem 0 0' }}>
                  Registro de: <b style={{ color: '#fbbf24' }}>{editingRecord.nombre_completo}</b>
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', flexShrink: 0, marginLeft: '1rem' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hora de Entrada</label>
                <input
                  type="datetime-local"
                  value={(() => {
                    try {
                      const d = new Date(editingRecord.hora_entrada);
                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    } catch { return ''; }
                  })()}
                  onChange={e => {
                    if (e.target.value) {
                      setEditingRecord({...editingRecord, hora_entrada: new Date(e.target.value).toISOString()});
                    }
                  }}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hora de Salida</label>
                <input
                  type="datetime-local"
                  value={(() => {
                    try {
                      if (!editingRecord.hora_salida) return '';
                      const d = new Date(editingRecord.hora_salida);
                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    } catch { return ''; }
                  })()}
                  onChange={e => setEditingRecord({...editingRecord, hora_salida: e.target.value ? new Date(e.target.value).toISOString() : null})}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    background: saving ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.15)',
                    border: `1px solid ${saving ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.5)'}`,
                    color: saving ? 'rgba(251,191,36,0.4)' : '#fbbf24',
                    padding: '0.7rem', fontSize: '0.72rem', fontWeight: 700,
                    fontFamily: 'inherit', letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = 'rgba(251,191,36,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                >
                  {saving ? 'GUARDANDO...' : '✓ GUARDAR'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  style={{
                    flex: 1,
                    background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.4)',
                    color: '#f87171',
                    padding: '0.7rem', fontSize: '0.72rem', fontWeight: 700,
                    fontFamily: 'inherit', letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  ✕ CANCELAR
                </button>
              </div>
            </form>
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
  color: '#fff',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  colorScheme: 'dark',
};

const thStyle: React.CSSProperties = {
  padding: '1.2rem 1.5rem',
  textAlign: 'left',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  fontWeight: 700
};

const tdStyle: React.CSSProperties = {
  padding: '1.2rem 1.5rem',
  color: '#fff',
  fontSize: '0.85rem'
};
