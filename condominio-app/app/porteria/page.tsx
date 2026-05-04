'use client';

import { useState, useEffect } from 'react';
import { Lock, LogIn, LogOut, Clock, RefreshCw, UserCheck } from 'lucide-react';
import Image from 'next/image';

const ACCENT = '#4ade80'; // Verde estilo terminal

type Trabajador = {
  id: string; // auth.users UUID
  nombre_completo: string;
};

type AsistenciaHoy = {
  id: number;
  usuario_id: string;
  hora_entrada: string;
  hora_salida: string | null;
};

export default function PorteriaPage() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaHoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const authSaved = localStorage.getItem('porteria_auth');
    if (authSaved === 'true') {
      setIsAuthenticated(true);
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Ocultamente se actualiza cada 1 minuto (60,000 milisegundos)
      const dataTimer = setInterval(fetchData, 60000);
      return () => clearInterval(dataTimer);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('login'); // Reusamos tu state de loading para mostrar que estamos verificando
    
    try {
      // 🛡️ El frontend ya no sabe el PIN. Ahora le pregunta al servidor.
      const res = await fetch('/api/porteria/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('porteria_auth', 'true');
        setIsAuthenticated(true);
        setErrorPin(false);
      } else {
        setErrorPin(true);
        setPinInput('');
      }
    } catch (error) {
      console.error('Error al verificar PIN', error);
      setErrorPin(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('porteria_auth');
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      // 1. Obtener trabajadores
      const { data: users, error: uErr } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .eq('rol', 'trabajador')
        .order('nombre_completo');
      if (uErr) throw uErr;

      // 2. Obtener la asistencia de HOY (00:00 a 23:59)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const tzOffset = hoy.getTimezoneOffset() * 60000;
      const todayISO = new Date(hoy.getTime() - tzOffset).toISOString().split('T')[0];

      const { data: asist, error: aErr } = await supabase
        .from('asistencia')
        .select('id, usuario_id, hora_entrada, hora_salida')
        .gte('hora_entrada', `${todayISO}T00:00:00`)
        .lte('hora_entrada', `${todayISO}T23:59:59`);
      if (aErr) throw aErr;

      setTrabajadores(users || []);
      setAsistencia(asist || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const marcarEntrada = async (usuarioId: string) => {
    setActionLoading(usuarioId);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('asistencia')
        .insert([{ 
          usuario_id: usuarioId,
          hora_entrada: new Date().toISOString()
        }]);

      if (error) throw error;
      await fetchData(); // Refrescar para ver el cambio
    } catch (err) {
      alert('Error al marcar entrada');
    } finally {
      setActionLoading(null);
    }
  };

  const marcarSalida = async (registroId: number, horaEntradaStr: string, usuarioId: string) => {
    setActionLoading(usuarioId);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const horaSalida = new Date();
      const horaEntrada = new Date(horaEntradaStr);
      const totalHoras = (horaSalida.getTime() - horaEntrada.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('asistencia')
        .update({ 
          hora_salida: horaSalida.toISOString(),
          total_horas: totalHoras
        })
        .eq('id', registroId);

      if (error) throw error;
      await fetchData(); 
    } catch (err) {
      alert('Error al marcar salida');
    } finally {
      setActionLoading(null);
    }
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Courier New', monospace", padding: '1rem', position: 'relative'
      }}>
        {/* Grid animado sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px', zIndex: 0, pointerEvents: 'none'
        }} />
        
        <form onSubmit={handleLogin} style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,222,128,0.2)',
          padding: '2.5rem', width: '100%', maxWidth: '380px', textAlign: 'center',
          position: 'relative', zIndex: 1, boxShadow: '0 0 30px rgba(74,222,128,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: ACCENT
            }}>
              <Lock size={24} />
            </div>
          </div>
          
          <h1 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700, margin: '0 0 0.5rem' }}>
            TERMINAL DE <span style={{ color: ACCENT }}>PORTERÍA</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', letterSpacing: '0.05em' }}>
            CONTROL DE ACCESO · PERSONAL
          </p>

          <input
            type="password"
            placeholder="INGRESE CLAVE"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{
              width: '100%', background: '#000', border: `1px solid ${errorPin ? '#f87171' : 'rgba(74,222,128,0.3)'}`,
              color: errorPin ? '#f87171' : ACCENT, padding: '0.8rem', fontSize: '1rem', textAlign: 'center',
              fontFamily: "'Courier New', monospace", outline: 'none', letterSpacing: '0.2em', marginBottom: '1rem'
            }}
            autoFocus
          />
          {errorPin && <div style={{ color: '#f87171', fontSize: '0.65rem', marginBottom: '1rem' }}>⚠ CÓDIGO INCORRECTO</div>}

          <button type="submit" disabled={actionLoading === 'login'} style={{
            width: '100%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.5)',
            color: ACCENT, padding: '0.8rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em',
            cursor: actionLoading === 'login' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', textTransform: 'uppercase',
            opacity: actionLoading === 'login' ? 0.5 : 1
          }}
          onMouseEnter={e => { if(actionLoading !== 'login') e.currentTarget.style.background = 'rgba(74,222,128,0.2)'; }}
          onMouseLeave={e => { if(actionLoading !== 'login') e.currentTarget.style.background = 'rgba(74,222,128,0.1)'; }}>
            {actionLoading === 'login' ? 'VERIFICANDO...' : 'ACCEDER AL SISTEMA'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Courier New', monospace",
      position: 'relative', overflowX: 'hidden'
    }}>
      {/* Navbar Superior Portería */}
      <header style={{
        background: '#0d0d14', borderBottom: '1px solid rgba(74,222,128,0.15)',
        padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/logo.png" alt="Logo" width={36} height={36} style={{ filter: 'grayscale(0.5)' }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em' }}>MONITOR DE ACCESO</div>
            <div style={{ fontSize: '0.6rem', color: ACCENT, letterSpacing: '0.15em' }}>PORTERÍA PRINCIPAL</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color={ACCENT} />
              {currentTime.toLocaleTimeString('es-CO')}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {currentTime.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          
          <button onClick={handleLogout} title="Bloquear Terminal" style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '4px'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
              ASISTENCIA <span style={{ color: ACCENT }}>TRABAJADORES</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Seleccione al trabajador para registrar su hora exacta de paso.
            </p>
          </div>
          <button onClick={fetchData} disabled={loading} style={{
            background: 'transparent', border: '1px solid rgba(74,222,128,0.2)', padding: '0.5rem 1rem',
            color: ACCENT, fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.5 : 1
          }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Sincronizar
          </button>
        </div>

        {loading && trabajadores.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: ACCENT }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em' }}>CARGANDO DIRECTORIO...</div>
          </div>
        ) : trabajadores.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', padding: '4rem', textAlign: 'center' }}>
            <UserCheck size={32} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem' }} />
            <div style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>No hay trabajadores registrados</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>El administrador debe dar de alta al personal en el módulo de Usuarios.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {trabajadores.map(trabajador => {
              // Buscar si tiene registro de asistencia hoy
              const regHoy = asistencia.find(a => a.usuario_id === trabajador.id);
              const yaEntro = !!regHoy;
              const yaSalio = !!regHoy?.hora_salida;
              
              const isLoading = actionLoading === trabajador.id;

              return (
                <div key={trabajador.id} style={{
                  background: yaSalio ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${yaSalio ? 'rgba(255,255,255,0.05)' : yaEntro ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                }}>
                  {/* Etiqueta de Estado */}
                  <div style={{
                    position: 'absolute', top: 0, right: 0, padding: '0.2rem 0.6rem',
                    fontSize: '0.55rem', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
                    background: yaSalio ? 'rgba(255,255,255,0.1)' : yaEntro ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)',
                    color: yaSalio ? 'rgba(255,255,255,0.4)' : yaEntro ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                    borderBottomLeftRadius: '4px'
                  }}>
                    {yaSalio ? 'INACTIVO' : yaEntro ? 'TURNO ACTIVO' : 'ESPERANDO INGRESO'}
                  </div>

                  {/* Info Trabajador */}
                  <div style={{ paddingRight: '40px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: yaSalio ? 'rgba(255,255,255,0.5)' : '#fff', marginBottom: '0.2rem' }}>
                      {trabajador.nombre_completo}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                      CÓDIGO: {trabajador.id.split('-')[0].toUpperCase()}
                    </div>
                  </div>

                  {/* Tiempos */}
                  {yaEntro && (
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', background: '#000', padding: '0.5rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', letterSpacing: '0.1em' }}>ENTRADA</div>
                        <div style={{ color: '#60a5fa', fontWeight: 700 }}>{new Date(regHoy.hora_entrada).toLocaleTimeString('es-CO')}</div>
                      </div>
                      {yaSalio && (
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', letterSpacing: '0.1em' }}>SALIDA</div>
                          <div style={{ color: '#a78bfa', fontWeight: 700 }}>{new Date(regHoy.hora_salida as string).toLocaleTimeString('es-CO')}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    {isLoading ? (
                      <div style={{ textAlign: 'center', padding: '0.5rem', color: ACCENT, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <RefreshCw size={14} className="spin" /> Procesando...
                      </div>
                    ) : !yaEntro ? (
                      <button 
                        onClick={() => marcarEntrada(trabajador.id)}
                        style={{
                          width: '100%', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)',
                          color: '#60a5fa', padding: '0.7rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          transition: 'all 0.2s', textTransform: 'uppercase'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.2)'; e.currentTarget.style.borderColor = '#60a5fa'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'; }}
                      >
                        <LogIn size={16} /> Marcar Entrada
                      </button>
                    ) : !yaSalio ? (
                      <button 
                        onClick={() => marcarSalida(regHoy.id, regHoy.hora_entrada, trabajador.id)}
                        style={{
                          width: '100%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                          color: '#f87171', padding: '0.7rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          transition: 'all 0.2s', textTransform: 'uppercase'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; e.currentTarget.style.borderColor = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; }}
                      >
                        <LogOut size={16} /> Marcar Salida
                      </button>
                    ) : (
                      <div style={{
                        width: '100%', padding: '0.7rem', textAlign: 'center', fontSize: '0.7rem', letterSpacing: '0.1em',
                        color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.05)', background: '#000'
                      }}>
                        JORNADA REGISTRADA
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
