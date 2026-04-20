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

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setTimeout(() => setVisible(true), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, filterEmployee]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Obtener rol
      const { data: profile } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
      if (profile) setUserRole(profile.rol);

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

      // 2. Obtener registros de asistencia
      let query = supabase
        .from('asistencia')
        .select('*')
        .order('hora_entrada', { ascending: false });

      if (filterEmployee !== 'all') {
        query = query.eq('usuario_id', filterEmployee);
      } else {
        query = query.limit(50);
      }

      const { data: records } = await query;
      
      // 3. Cruzar datos manualmente
      const mapped = (records || []).map((r: any) => {
        const u = (users || []).find((user: any) => user.id === r.usuario_id);
        return {
          ...r,
          nombre_completo: u ? u.nombre_completo : 'Usuario desconocido'
        };
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#fff', fontFamily: "'Courier New', monospace" }}>
          Cargando sistema de asistencia...
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>Operatividad</p>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                Registro de <span style={{ color: '#60a5fa' }}>Asistencia</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Control horario de entrada y salida del personal.</p>
            </div>
            
            {userRole === 'admin' && (
              <div style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                <span style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>● MODO ADMINISTRADOR</span>
              </div>
            )}
          </div>

      <div style={{ display: 'grid', gridTemplateColumns: userRole === 'admin' ? '1fr' : '1fr 350px', gap: '2.5rem' }}>
        
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
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem', fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem', marginBottom: '2rem' }}>
              {currentTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              {!activeRecord ? (
                <button onClick={handleEntry} disabled={saving} style={{ background: '#60a5fa', color: '#fff', border: 'none', padding: '1rem 2.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Play size={18} fill="currentColor" /> {saving ? '...' : 'MARCAR ENTRADA'}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#4ade80', fontSize: '0.6rem', textTransform: 'uppercase', margin: 0 }}>En turno desde</p>
                    <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{formatTime(activeRecord.hora_entrada)}</p>
                  </div>
                  <button onClick={handleExit} disabled={saving} style={{ background: '#f87171', color: '#fff', border: 'none', padding: '1rem 2.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Square size={18} fill="currentColor" /> {saving ? '...' : 'MARCAR SALIDA'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Administrador (Solo Admin) */}
          {userRole === 'admin' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={18} style={{ color: '#a78bfa' }} />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', margin: 0 }}>SEGUIMIENTO DE PERSONAL</h3>
                </div>
                
                <select 
                  value={filterEmployee} 
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all" style={{ background: '#0a0a0f', color: '#fff' }}>Todos los empleados</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id} style={{ background: '#0a0a0f', color: '#fff' }}>{e.nombre_completo}</option>)}
                </select>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '0.9rem 1.5rem', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Empleado</th>
                        <th style={{ padding: '0.9rem 1.5rem', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Fecha</th>
                        <th style={{ padding: '0.9rem 1.5rem', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Entrada</th>
                        <th style={{ padding: '0.9rem 1.5rem', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Salida</th>
                        <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Horas</th>
                        <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase' }}></th>
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
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Eliminar registro"
                            style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.6)', padding: '0.25rem 0.6rem', fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#f87171'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
                          >
                            ✕
                          </button>
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
    </div>
  );
}
