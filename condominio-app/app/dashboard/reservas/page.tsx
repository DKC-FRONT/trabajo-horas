'use client';

import { useEffect, useState } from 'react';

type Rol = 'admin' | 'trabajador' | 'residente';
type EstadoReserva = 'pendiente' | 'aprobada' | 'rechazada';

type UserSession = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  casa_id?: number | null;
};

type Reserva = {
  id: number;
  casa_id: number;
  numero_casa: string;
  area: string;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoReserva;
  valor: number;
};

type Casa = { id: number; numero_casa: string };

const ACCENT = '#4ade80';

const HORARIOS = [
  { value: 8, label: '08:00 a.m.' },
  { value: 9, label: '09:00 a.m.' },
  { value: 10, label: '10:00 a.m.' },
  { value: 11, label: '11:00 a.m.' },
  { value: 12, label: '12:00 p.m.' },
  { value: 13, label: '01:00 p.m.' },
  { value: 14, label: '02:00 p.m.' },
  { value: 15, label: '03:00 p.m.' },
  { value: 16, label: '04:00 p.m.' },
  { value: 17, label: '05:00 p.m.' },
  { value: 18, label: '06:00 p.m.' },
  { value: 19, label: '07:00 p.m.' },
  { value: 20, label: '08:00 p.m.' },
  { value: 21, label: '09:00 p.m.' },
  { value: 22, label: '10:00 p.m.' },
  { value: 23, label: '11:00 p.m.' },
  { value: 24, label: '12:00 a.m. (Día sig.)' },
  { value: 25, label: '01:00 a.m. (Día sig.)' },
  { value: 26, label: '02:00 a.m. (Día sig.)' },
  { value: 27, label: '03:00 a.m. (Día sig.)' },
];

const AREAS = [
  'CAPILLA',
  'SALON EVENTOS',
  'RESTAURANTE',
  'CAPILLA Y SALON DE EVENTOS',
  'CAPILLA Y RESTAURANTE',
  'CANCHA DE FUTBOL'
];

const ESTADO_META: Record<EstadoReserva, { color: string; label: string }> = {
  pendiente: { color: '#fbbf24', label: 'Pendiente' },
  aprobada:  { color: '#4ade80', label: 'Aprobada'  },
  rechazada: { color: '#f87171', label: 'Rechazada' },
};

function isWeekend(dateStr: string) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

function calcularValor(area: string, fecha: string, iniVal: number, finVal: number) {
  if (finVal <= iniVal) return 0;
  
  let hDiurnas = 0;
  let hNocturnas = 0;
  
  for(let i = iniVal; i < finVal; i++) {
     if (i >= 8 && i < 18) hDiurnas++;
     else hNocturnas++;
  }
  
  if (area === 'CAPILLA') {
      return hNocturnas > 0 ? 178592 : 112058;
  }
  if (area === 'SALON EVENTOS') {
      return (hDiurnas * 112058) + (hNocturnas * 224116);
  }
  if (area === 'RESTAURANTE') {
      return (hDiurnas * 179118) + (hNocturnas * 268764);
  }
  if (area === 'CAPILLA Y SALON DE EVENTOS') {
      return (hDiurnas * 123264) + (hNocturnas * 241975);
  }
  if (area === 'CAPILLA Y RESTAURANTE') {
      return (hDiurnas * 190323) + (hNocturnas * 286623);
  }
  if (area === 'CANCHA DE FUTBOL') {
      return isWeekend(fecha) ? 210109 : 157581;
  }
  return 0;
}

function parseHora(hora: string) {
  const parts = hora.split(':');
  const h = Number(parts[0]);
  if (h >= 24) {
    const realH = h - 24;
    return `${realH.toString().padStart(2, '0')}:${parts[1]} (Día sig.)`;
  }
  return `${h.toString().padStart(2, '0')}:${parts[1]}`;
}

function normalizeHourValue(value: number) {
  return value >= 24 ? value - 24 : value;
}

function formatTimeForPayload(value: number) {
  return `${normalizeHourValue(value).toString().padStart(2, '0')}:00`;
}

function isCrossMidnight(endValue: number) {
  return endValue >= 24;
}

function loadEditableEndHour(startHour: number, endHour: number) {
  if (endHour <= startHour) {
    return endHour + 24;
  }
  return endHour;
}

export default function ReservasPage() {
  const [user, setUser]         = useState<UserSession | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [casas, setCasas]       = useState<Casa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [visible, setVisible]   = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showTarifasModal, setShowTarifasModal] = useState(false);

  // Offline support
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);
  const [reservasSyncQueue, setReservasSyncQueue] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reservas_sync_queue');
      if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    }
    return [];
  });

  // Form
  const [area, setArea]           = useState(AREAS[0]);
  const [fecha, setFecha]         = useState('');
  const [horaInicio, setHoraInicio] = useState(10);
  const [horaFin, setHoraFin]     = useState(12);
  const [casaSeleccionada, setCasaSeleccionada] = useState('');
  const [filtroTablaCasa, setFiltroTablaCasa] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const reservasFiltradas = reservas.filter((r: any) => {
    if (!filtroTablaCasa) return true;
    return String(r.casa_id) === filtroTablaCasa;
  });

  // Persistir cola de sync
  useEffect(() => {
    localStorage.setItem('reservas_sync_queue', JSON.stringify(reservasSyncQueue));
  }, [reservasSyncQueue]);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincronizar cola al recuperar conexión
  const handleSincronizarReservas = async () => {
    if (reservasSyncQueue.length === 0 || syncing) return;
    setSyncing(true);
    notify('Sincronizando reservas pendientes...');
    const remaining = [...reservasSyncQueue];
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      while (remaining.length > 0) {
        const action = remaining[0];
        if (action.type === 'create') {
          const { error } = await supabase.from('reservas').insert([action.data]);
          if (error) throw error;
        } else if (action.type === 'delete') {
          const { error } = await supabase.from('reservas').delete().eq('id', action.id);
          if (error) throw error;
        } else if (action.type === 'estado') {
          const { error } = await supabase.from('reservas').update({ estado: action.estado }).eq('id', action.id);
          if (error) throw error;
        }
        remaining.shift();
      }
      setReservasSyncQueue([]);
      localStorage.removeItem('reservas_sync_queue');
      notify('¡Sincronización exitosa!');
      await fetchReservas();
    } catch (err: any) {
      setReservasSyncQueue(remaining);
      notify('Error al sincronizar: ' + err.message, true);
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Hook inicial: Carga la sesión del usuario y los datos necesarios.
   */
  useEffect(() => {
    const init = async () => {
      try {
        const { createClient } = await import('@/lib/client');
        const supabase = createClient();
        
        // 1. Obtener sesión de auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // 2. Obtener perfil detallado (rol, casa_id)
          const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            const sessionData: UserSession = {
              id: profile.id,
              nombre: profile.nombre_completo,
              correo: authUser.email || '',
              rol: profile.rol as Rol,
              casa_id: profile.casa_id
            };
            setUser(sessionData);
            if (sessionData.casa_id) setCasaSeleccionada(String(sessionData.casa_id));
            
            // 3. Cargar datos específicos del rol
            await fetchReservas();
            if (sessionData.rol === 'admin' || sessionData.rol === 'trabajador') {
              await fetchCasas();
            }
          }
        }
      } catch (err) {
        console.error('Error inicializando reservas:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
    setTimeout(() => setVisible(true), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Obtiene la lista de todas las casas (para admins).
   */
  const fetchCasas = async () => {
    const { createClient } = await import('@/lib/client');
    const supabase = createClient();
    const { data } = await supabase.from('casas').select('*');
    
    // Ordenar numéricamente (1, 2, 3...)
    const sorted = (data || []).sort((a: any, b: any) => {
      const numA = parseInt(a.numero_casa.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.numero_casa.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    setCasas(sorted);
  };

  /**
   * Obtiene el historial de reservas de Supabase (con caché offline).
   */
  const fetchReservas = async () => {
    try {
      setLoading(true);
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      // Hacemos join con la tabla de casas para mostrar el número de unidad
      const { data, error } = await supabase
        .from('reservas')
        .select('*, casas(numero_casa)')
        .order('creado_el', { ascending: false })
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;

      const adapted: Reserva[] = (data || []).map((r: any) => ({
        ...r,
        numero_casa: r.casas?.numero_casa || 'N/A',
        fecha_reserva: r.fecha
      }));

      setReservas(adapted);
      // Guardar en caché local
      localStorage.setItem('reservas_cache', JSON.stringify(adapted));
    } catch (err: any) {
      // Intentar cargar desde caché si hay error de conexión
      const cached = localStorage.getItem('reservas_cache');
      if (cached) {
        try {
          setReservas(JSON.parse(cached));
          notify('Cargado desde caché local (sin conexión).');
          return;
        } catch {}
      }
      notify('Error al cargar reservas: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Notificaciones
   */
  const notify = (msg: string, err = false) => {
    if (err) {
      setErrorMsg(msg);
    } else {
      setSuccessMsg(msg);
    }
    setTimeout(() => {
      if (err) {
        setErrorMsg('');
      } else {
        setSuccessMsg('');
      }
    }, err ? 6000 : 3500);
  };

  /**
   * Determina qué casa_id usar para la reserva
   */
  const getCasaId = (): number | null => {
    if (user?.rol === 'residente') return user.casa_id ?? null;
    if (casaSeleccionada) return Number(casaSeleccionada);
    return null;
  };

  const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const valorEstimado = calcularValor(area, fecha, horaInicio, horaFin);

  /**
   * Carga los datos de una reserva en el formulario para editarla
   */
  const handleEditStart = (r: Reserva) => {
    setEditId(r.id);
    setArea(r.area);
    setFecha(r.fecha_reserva);
    const inicio = parseInt(r.hora_inicio.split(':')[0]);
    const fin = parseInt(r.hora_fin.split(':')[0]);
    setHoraInicio(inicio);
    setHoraFin(loadEditableEndHour(inicio, fin));
    setCasaSeleccionada(String(r.casa_id));
    
    // Hacer scroll suave hacia arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Editando reserva #' + r.id);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setArea(AREAS[0]);
    setFecha('');
    setHoraInicio(10);
    setHoraFin(12);
    if (user?.rol === 'admin') setCasaSeleccionada('');
  };

  /**
   * Crea/actualiza una reserva — con soporte offline
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const casaId = getCasaId();
    if (!casaId) {
      notify(user?.rol === 'residente'
        ? 'Cuenta sin casa vinculada. Avisa al administrador.'
        : 'Debes seleccionar una casa.', true);
      return;
    }
    if (!fecha) { notify('Elige una fecha.', true); return; }
    if (horaInicio >= horaFin && !isCrossMidnight(horaFin)) { notify('Fin debe ser después de inicio.', true); return; }

    const payload = {
      casa_id: casaId,
      area,
      fecha,
      hora_inicio: formatTimeForPayload(horaInicio),
      hora_fin: formatTimeForPayload(horaFin),
      valor: valorEstimado,
      estado: 'pendiente' as EstadoReserva,
    };

    // ── OFFLINE: guardar localmente y encolar ──
    if (!isOnline) {
      const tempId = Date.now();
      if (!editId) {
        const localReserva: Reserva = {
          ...payload,
          id: tempId,
          numero_casa: casas.find(c => c.id === casaId)?.numero_casa || '?',
          fecha_reserva: fecha,
        };
        const nuevas = [localReserva, ...reservas];
        setReservas(nuevas);
        localStorage.setItem('reservas_cache', JSON.stringify(nuevas));
        setReservasSyncQueue(prev => [...prev, { type: 'create', data: payload }]);
        notify('Reserva guardada localmente. Se sincronizará al recuperar conexión.');
      } else {
        notify('No puedes actualizar reservas sin conexión.', true);
      }
      handleCancelEdit();
      return;
    }

    // ── ONLINE: enviar a Supabase ──
    try {
      setFormLoading(true);
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      if (editId) {
        const { error } = await supabase
          .from('reservas')
          .update({ casa_id: casaId, area, fecha,
            hora_inicio: payload.hora_inicio,
            hora_fin: payload.hora_fin,
            valor: valorEstimado })
          .eq('id', editId);
        if (error) throw error;
        notify('Reserva actualizada exitosamente');
      } else {
        const { error } = await supabase
          .from('reservas')
          .insert([{ ...payload }]);
        if (error) throw error;
        notify('Solicitud de reserva enviada');
      }
      handleCancelEdit();
      await fetchReservas();
    } catch (err: any) {
      notify('Error al procesar: ' + err.message, true);
    } finally {
      setFormLoading(false);
    }
  };

  /**
   * Actualiza el estado (Pendiente/Aprobada/Rechazada) de una reserva — con soporte offline
   */
  const cambiarEstado = async (id: number, estado: EstadoReserva) => {
    // Actualizar localmente de inmediato
    const actualizadas = reservas.map(r => r.id === id ? { ...r, estado } : r);
    setReservas(actualizadas);
    localStorage.setItem('reservas_cache', JSON.stringify(actualizadas));

    if (!isOnline) {
      setReservasSyncQueue(prev => {
        const filtrado = prev.filter(a => !(a.type === 'estado' && a.id === id));
        return [...filtrado, { type: 'estado', id, estado }];
      });
      notify(`Estado cambiado a ${estado} (sin conexión, se sincronizará).`);
      return;
    }
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('reservas').update({ estado }).eq('id', id);
      if (error) throw error;
      notify(`La reserva ahora está ${estado}`);
    } catch (err: any) { notify('Fallo al cambiar estado: ' + err.message, true); }
  };

  /**
   * Borra un registro de reserva — con soporte offline
   */
  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro quieres cancelar esta reserva?')) return;
    const filtradas = reservas.filter(r => r.id !== id);
    setReservas(filtradas);
    localStorage.setItem('reservas_cache', JSON.stringify(filtradas));

    if (!isOnline) {
      setReservasSyncQueue(prev => [...prev, { type: 'delete', id }]);
      notify('Reserva eliminada localmente (sin conexión, se sincronizará).');
      return;
    }
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase.from('reservas').delete().eq('id', id);
      if (error) throw error;
      notify('Reserva cancelada exitosamente');
    } catch (err: any) { notify('Error al borrar: ' + err.message, true); }
  };

  const fieldStyle = (field: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${focusedField === field ? ACCENT + '80' : 'rgba(255,255,255,0.12)'}`,
    boxShadow: focusedField === field ? `0 0 0 3px ${ACCENT}15` : 'none',
    color: '#ffffff', fontSize: '0.8rem', padding: '0.65rem 0.85rem',
    fontFamily: 'inherit', outline: 'none', appearance: 'none' as any,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const labelStyle = (field?: string): React.CSSProperties => ({
    display: 'block', fontSize: '0.6rem', letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: field && focusedField === field ? ACCENT : 'rgba(255,255,255,0.55)',
    marginBottom: '0.4rem', transition: 'color 0.2s',
  });

  const counts = {
    pendiente: reservasFiltradas.filter((r: any) => r.estado === 'pendiente').length,
    aprobada:  reservasFiltradas.filter((r: any) => r.estado === 'aprobada').length,
    rechazada: reservasFiltradas.filter((r: any) => r.estado === 'rechazada').length,
  };

  // Solo Admin y Residente (con casa) pueden CREAR reservas
  const canCreateReserva = user?.rol === 'admin' || (user?.rol === 'residente' && !!user.casa_id);

  return (
    <div style={{
      padding: '2.5rem',
      fontFamily: 'inherit',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>Módulo</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Áreas <span style={{ color: ACCENT }}>Comunes</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 1)', margin: '0.4rem 0 0', letterSpacing: '0.04em' }}>
            {user?.rol === 'admin'
              ? 'Gestión de todas las reservas del condominio'
              : user?.rol === 'trabajador'
                ? 'Vista de reservas programadas en áreas comunes'
                : user?.casa_id
                  ? 'Reserva zonas comunes para tu casa'
                  : 'Vincula tu cuenta a una casa para reservar'}
          </p>
          <button
            onClick={() => setShowTarifasModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '0.4rem 0.8rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'inherit',
              fontWeight: 600,
              marginTop: '0.65rem',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = ACCENT;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            📋 Ver Tarifas Vigentes
          </button>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(Object.entries(counts) as [EstadoReserva, number][])
              .filter(([, n]) => n > 0)
              .map(([estado, n]) => (
                <div key={estado} style={{
                  padding: '0.35rem 0.75rem',
                  background: `${ESTADO_META[estado].color}15`,
                  border: `1px solid ${ESTADO_META[estado].color}40`,
                  fontSize: '0.62rem', color: ESTADO_META[estado].color, letterSpacing: '0.08em',
                }}>
                  {n} {ESTADO_META[estado].label}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Banner Offline Sync ── */}
      {reservasSyncQueue.length > 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderLeft: '3px solid #fbbf24',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.1rem', animation: isOnline ? 'none' : 'spin 2s linear infinite', display: 'inline-block' }}>◌</span>
            <div>
              <div style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>Sincronización pendiente</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                {reservasSyncQueue.length} acción{reservasSyncQueue.length !== 1 ? 'es' : ''} guardada{reservasSyncQueue.length !== 1 ? 's' : ''} localmente esperando conexión.
              </div>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={handleSincronizarReservas}
              disabled={syncing}
              style={{
                background: '#fbbf24',
                border: 'none',
                color: '#0a0a0f',
                padding: '0.4rem 1rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          )}
        </div>
      )}

      {/* ── Indicador de conexión ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#4ade80' : '#f87171', animation: isOnline ? 'pulse 2s infinite' : 'none' }} />
        <span style={{ fontSize: '0.65rem', color: isOnline ? '#4ade80' : '#f87171', letterSpacing: '0.06em' }}>
          {isOnline ? 'EN LÍNEA' : 'SIN CONEXIÓN — Cambios guardados localmente'}
        </span>
      </div>

      {/* ── Alertas ── */}
      {errorMsg && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderLeft: '3px solid #f87171', color: '#f87171', padding: '0.85rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0 }}>⚠</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderLeft: '3px solid #4ade80', color: '#4ade80', padding: '0.85rem 1rem', fontSize: '0.78rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ── Formulario ── */}
      {canCreateReserva && (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}70, transparent)` }} />

          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>
                {editId ? `Modificando ID #${editId}` : 'Nueva solicitud'}
              </p>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {editId ? 'ACTUALIZAR DATOS' : 'RESERVAR ÁREA COMÚN'}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
               <span style={{ fontSize: '1rem', fontWeight: 700, color: valorEstimado > 0 ? ACCENT : '#ffffff' }}>
                 {formatter.format(valorEstimado)}
               </span>
               <p style={{ fontSize: '0.55rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>Valor Estimado</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>

            {/* Select casa — solo admin */}
            {user?.rol === 'admin' && (
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle('casa')}>Casa *</label>
                <select value={casaSeleccionada} onChange={e => setCasaSeleccionada(e.target.value)}
                  style={fieldStyle('casa')} required
                  onFocus={() => setFocusedField('casa')} onBlur={() => setFocusedField(null)}>
                  <option value="" style={{ background: '#0a0a0f', color: 'rgba(255, 255, 255, 1)' }}>— Seleccionar</option>
                  {casas.map((c: any) => (
                    <option key={c.id} value={c.id} style={{ background: '#0a0a0f', color: '#fff' }}>
                      Casa {c.numero_casa}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Área */}
            <div style={{ flex: '1 1 200px' }}>
              <label style={labelStyle('area')}>Área</label>
              <select value={area} onChange={e => setArea(e.target.value)}
                style={fieldStyle('area')}
                onFocus={() => setFocusedField('area')} onBlur={() => setFocusedField(null)}>
                {AREAS.map((a: any) => (
                  <option key={a} value={a} style={{ background: '#0a0a0f', color: '#fff' }}>{a}</option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle('fecha')}>Fecha *</label>
              <input required type="date" value={fecha}
                onChange={e => setFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ ...fieldStyle('fecha'), colorScheme: 'dark' }}
                onFocus={() => setFocusedField('fecha')} onBlur={() => setFocusedField(null)} />
            </div>

            {/* Hora inicio */}
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle('ini')}>Desde</label>
              <select value={horaInicio} onChange={e => setHoraInicio(Number(e.target.value))}
                style={fieldStyle('ini')}
                onFocus={() => setFocusedField('ini')} onBlur={() => setFocusedField(null)}>
                {HORARIOS.slice(0, -1).map((h: any) => (
                  <option key={h.value} value={h.value} style={{ background: '#0a0a0f', color: '#fff' }}>{h.label}</option>
                ))}
              </select>
            </div>

            {/* Hora fin */}
            <div style={{ flex: '1 1 140px' }}>
              <label style={labelStyle('fin')}>Hasta</label>
              <select value={horaFin} onChange={e => setHoraFin(Number(e.target.value))}
                style={fieldStyle('fin')}
                onFocus={() => setFocusedField('fin')} onBlur={() => setFocusedField(null)}>
                {HORARIOS.slice(1).map((h: any) => (
                  <option key={h.value} value={h.value} style={{ background: '#0a0a0f', color: '#fff' }}>{h.label}</option>
                ))}
              </select>
            </div>

            {/* Botón */}
            <div>
              <button type="submit" disabled={formLoading || valorEstimado === 0}
                style={{
                  background: (formLoading || valorEstimado === 0) ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`,
                  border: `1px solid ${(formLoading || valorEstimado === 0) ? 'rgba(255,255,255,0.08)' : ACCENT + '60'}`,
                  color: (formLoading || valorEstimado === 0) ? 'rgba(255,255,255,0.3)' : ACCENT,
                  padding: '0.65rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
                  cursor: (formLoading || valorEstimado === 0) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit', fontWeight: 600,
                  height: '100%',
                }}
                onMouseEnter={e => { if (!formLoading && valorEstimado > 0) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}40, ${ACCENT}20)`; }}
                onMouseLeave={e => { if (!formLoading && valorEstimado > 0) e.currentTarget.style.background = `linear-gradient(135deg, ${ACCENT}25, ${ACCENT}10)`; }}
              >
                {formLoading
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Procesando...</>
                  : <>{editId ? '💾 Guardar Cambios' : '→ Solicitar'}</>}
              </button>
            </div>

            {editId && (
              <div>
                <button type="button" onClick={handleCancelEdit}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '0.65rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'inherit', fontWeight: 600,
                    height: '100%',
                  }}
                >
                  Cancelar Edición
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Aviso residente sin casa */}
      {user?.rol === 'residente' && !user.casa_id && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderLeft: '3px solid #fbbf24', padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '0.8rem', color: '#fbbf24' }}>
          ⚠ Tu cuenta no está vinculada a ninguna casa. Contacta al administrador para que la asigne.
        </div>
      )}

      {/* ── Tabla ── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${ACCENT}50, transparent)` }} />
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.2rem' }}>Historial</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              TODAS LAS RESERVAS
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {(user?.rol === 'admin' || user?.rol === 'trabajador') && (
              <select 
                value={filtroTablaCasa} 
                onChange={e => setFiltroTablaCasa(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.65rem', padding: '0.25rem 0.5rem', outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="" style={{ background: '#0a0a0f', color: '#fff' }}>Todas las casas</option>
                {casas.map((c: any) => (
                  <option key={c.id} value={c.id} style={{ background: '#0a0a0f', color: '#fff' }}>
                    Casa {c.numero_casa}
                  </option>
                ))}
              </select>
            )}
            <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)' }}>{reservasFiltradas.length} registros</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Casa', 'Área', 'Fecha', 'Horario', 'Valor', 'Estado', 'Acciones'].map((h, i) => (
                  <th key={h} style={{ padding: '0.85rem 1rem', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: i === 6 ? 'right' : 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 1)', fontSize: '0.8rem' }}>
                  <span style={{ animation: 'spin 1.2s linear infinite', display: 'inline-block', marginRight: '0.5rem' }}>◌</span> Cargando...
                </td></tr>
              ) : reservasFiltradas.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.25 }}>📅</div>
                  <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.82rem', letterSpacing: '0.05em' }}>No hay reservas agendadas</div>
                  {canCreateReserva && (
                    <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.7rem', marginTop: '0.35rem' }}>Usa el formulario de arriba para crear una</div>
                  )}
                </td></tr>
              ) : (
                reservasFiltradas.map((r, i) => {
                  const meta = ESTADO_META[r.estado];
                  const isHov = hoveredRow === r.id;
                  const fechaFmt = new Date(r.fecha_reserva + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                  // Verificar si es propietario de la reserva
                  const esPropietario = user?.rol === 'residente' && user?.casa_id === r.casa_id;
                  const canDelete = user?.rol === 'admin' || (esPropietario && r.estado === 'pendiente');

                  return (
                    <tr key={r.id}
                      style={{
                        background: isHov ? `${ACCENT}08` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.15s',
                        animation: `fadeSlideIn 0.3s ease ${i * 0.04}s both`,
                        opacity: esPropietario || user?.rol !== 'residente' ? 1 : 0.6 // Atenuar las reservas de otros si eres residente
                      }}
                      onMouseEnter={() => setHoveredRow(r.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: esPropietario ? ACCENT : '#ffffff', fontWeight: 700 }}>
                        Casa {r.numero_casa} {esPropietario && <span style={{fontSize: '0.5rem', marginLeft:'4px'}}>(Tú)</span>}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 1)' }}>{r.area}</td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.77rem', color: 'rgba(255, 255, 255, 1)' }}>{fechaFmt}</td>
                      <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.74rem', color: ACCENT, background: `${ACCENT}12`, padding: '0.22rem 0.6rem', border: `1px solid ${ACCENT}30`, fontWeight: 600 }}>
                          {parseHora(r.hora_inicio)} – {parseHora(r.hora_fin)}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: '#4ade80' }}>
                        {formatter.format(r.valor)}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontSize: '0.62rem', padding: '0.22rem 0.6rem', border: `1px solid ${meta.color}40`, color: meta.color, background: `${meta.color}12`, letterSpacing: '0.08em', fontWeight: 600 }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {user?.rol === 'admin' && r.estado === 'pendiente' && (
                            <>
                              <button onClick={() => cambiarEstado(r.id, 'aprobada')}
                                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', padding: '0.3rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: 600 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.1)'}>
                                ✓ Aprobar
                              </button>
                              <button onClick={() => cambiarEstado(r.id, 'rechazada')}
                                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.3rem 0.75rem', fontSize: '0.65rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: 600 }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}>
                                ✕ Rechazar
                              </button>
                            </>
                          )}
                          {/* Botón Editar para Admin o Propietario si está pendiente */}
                          {(user?.rol === 'admin' || (esPropietario && r.estado === 'pendiente')) && (
                            <button onClick={() => handleEditStart(r)}
                              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '0.3rem 0.65rem', fontSize: '0.62rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                              onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(r.id)}
                              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255, 255, 255, 1)', padding: '0.3rem 0.65rem', fontSize: '0.62rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', textTransform: 'uppercase' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.5)'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}>
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de Tarifas ── */}
      {showTarifasModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          animation: 'fadeIn 0.25s ease forwards',
        }}
        onClick={() => setShowTarifasModal(false)}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            padding: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#ffffff', margin: 0, fontWeight: 700, letterSpacing: '0.05em' }}>
                📋 VALORES TARIFAS - ZONA SOCIAL
              </h3>
              <button 
                onClick={() => setShowTarifasModal(false)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                ✕
              </button>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              background: '#ffffff', 
              padding: '0.75rem', 
              borderRadius: '4px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/Valores sonas sociales.jpeg" 
                alt="Valores Tarifa U Otros Zona Social" 
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '68vh', objectFit: 'contain' }} 
              />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontStyle: 'italic' }}>
                * Valores vigentes para el año 2026.
              </p>
              <button 
                onClick={() => setShowTarifasModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  padding: '0.4rem 1rem',
                  fontSize: '0.68rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = ACCENT;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        select option { background: #0a0a0f; color: #ffffff; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        ::placeholder { color: rgba(255,255,255,0.3) !important; }
      `}</style>
    </div>
  );
}