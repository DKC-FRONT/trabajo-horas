'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/client';

type SemanaTarea = {
  id: string;
  semanaKey: string;
  dia: string;
  hora: string;
  descripcion: string;
  createdAt: string;
  usuarioId: string;
  usuarioNombre: string;
  completado: boolean;
};

type UserProfile = {
  id: string;
  rol: string;
  nombre_completo?: string;
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = Array.from({ length: 8 }, (_, i) => {
  const h = 6 + i;
  return `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
});

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getSemanaKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayHeader(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleDateString('es-CO', { month: 'short' });
  return `${day} ${month}`;
}

export default function SemanaPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tareas, setTareas] = useState<SemanaTarea[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ dia: string; hora: string } | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const semanaKey = getSemanaKey(weekStart);

  useEffect(() => {
    const initialize = async () => {
      await fetchUser();
    };
    initialize();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/semana?semanaKey=${encodeURIComponent(semanaKey)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al cargar tareas.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al cargar tareas.');
      }
      setTareas((data || []).map((item: any) => ({
        id: item.id,
        semanaKey: item.semana_key,
        dia: item.dia,
        hora: item.hora,
        descripcion: item.descripcion,
        usuarioId: item.usuario_id,
        usuarioNombre: item.usuario_nombre,
        completado: item.completado ?? false,
        createdAt: item.created_at,
      })));
    } catch (err: any) {
      console.error('Error fetchTasks:', err);
      setStatusMessage(err.message || 'No se pudieron cargar las tareas.');
    }
  }, [semanaKey, user]);

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user, semanaKey, fetchTasks]);

  const fetchUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('No se encontró sesión de usuario.');
        return;
      }

      const { data: profile, error } = await supabase
        .from('usuarios')
        .select('id, rol, nombre_completo')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) {
        setUser({ id: authUser.id, rol: 'trabajador', nombre_completo: authUser.email || undefined });
      } else {
        setUser(profile as UserProfile);
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err);
    }
  };

  const handleGuardarTarea = async () => {
    if (!selectedCell || !newTaskDesc.trim() || !user) return;

    const [horaStart] = selectedCell.hora.split(' - ')[0].split(':');
    const hora = `${horaStart}:00`;

    try {
      setStatusMessage('Guardando tarea...');
      const response = await fetch('/api/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semanaKey,
          dia: selectedCell.dia,
          hora,
          descripcion: newTaskDesc.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al guardar la tarea.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al guardar la tarea.');
      }

      if (!data || !data.id) {
        throw new Error('No se recibieron datos de la tarea creada.');
      }

      setTareas((prev) => [
        ...prev,
        {
          id: data.id,
          semanaKey: data.semana_key,
          dia: data.dia,
          hora: data.hora,
          descripcion: data.descripcion,
          usuarioId: data.usuario_id,
          usuarioNombre: data.usuario_nombre,
          completado: data.completado ?? false,
          createdAt: data.created_at,
        },
      ]);

      setNewTaskDesc('');
      setSelectedCell(null);
      setStatusMessage('');
    } catch (err: any) {
      console.error('Error guardando tarea:', err);
      setStatusMessage(err.message || 'No se pudo guardar la tarea.');
    }
  };

  const handleToggleCompletado = async (id: string) => {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;

    try {
      const response = await fetch('/api/semana', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completado: !tarea.completado }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al actualizar.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al actualizar.');
      }

      setTareas((prev) => prev.map((item) => item.id === id ? { ...item, completado: !item.completado } : item));
    } catch (err: any) {
      console.error('Error actualizando tarea:', err);
      setStatusMessage(err.message || 'No se pudo actualizar la tarea.');
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      const response = await fetch('/api/semana', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al eliminar.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al eliminar.');
      }

      setTareas((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error('Error eliminando tarea:', err);
      setStatusMessage(err.message || 'No se pudo eliminar la tarea.');
    }
  };

  const cambiarSemana = (offset: number) => {
    const siguiente = new Date(weekStart);
    siguiente.setDate(siguiente.getDate() + offset * 7);
    setWeekStart(getMonday(siguiente));
  };

  const tareasPorCelda = useMemo(() => {
    const map = new Map<string, SemanaTarea[]>();
    tareas
      .filter((t) => t.semanaKey === semanaKey)
      .forEach((t) => {
        const key = `${t.dia}|${t.hora}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      });
    return map;
  }, [tareas, semanaKey]);

  const tareasSemana = useMemo(() => {
    return tareas.filter((t) => t.semanaKey === semanaKey);
  }, [tareas, semanaKey]);

  const tareasCompletadas = useMemo(() => {
    return tareasSemana.filter((t) => t.completado).length;
  }, [tareasSemana]);

  const horasMasProductiva = useMemo(() => {
    const map = new Map<string, number>();
    tareasSemana.forEach((t) => {
      const count = (map.get(t.hora) || 0) + 1;
      map.set(t.hora, count);
    });
    if (map.size === 0) return null;
    const max = Array.from(map.entries()).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    );
    return max[0];
  }, [tareasSemana]);

  const promedioPorDia = useMemo(() => {
    if (tareasSemana.length === 0) return 0;
    const dias = new Set(tareasSemana.map((t) => t.dia));
    return Math.round(tareasSemana.length / dias.size);
  }, [tareasSemana]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dia: string, hora: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const tarea = tareas.find((t) => t.id === draggedTaskId);
    if (!tarea) return;

    const [horaStart] = hora.split(' - ')[0].split(':');
    const newHora = `${horaStart}:00`;

    if (tarea.dia === dia && tarea.hora === newHora) {
      setDraggedTaskId(null);
      return;
    }

    try {
      const response = await fetch('/api/semana', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggedTaskId, dia, hora: newHora }),
      });

      if (!response.ok) {
        throw new Error('Error al mover la tarea');
      }

      setTareas((prev) =>
        prev.map((t) =>
          t.id === draggedTaskId ? { ...t, dia, hora: newHora } : t
        )
      );
    } catch (err) {
      console.error('Error al mover tarea:', err);
      setStatusMessage('No se pudo mover la tarea');
    } finally {
      setDraggedTaskId(null);
    }
  };

  const semanaInicio = weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const semanaFin = new Date(weekStart);
  semanaFin.setDate(semanaFin.getDate() + 5);
  const semanaFinFormatted = semanaFin.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#0b0f1a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
            Cronograma Semanal
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            Personal de Aseo y Apoyo de Jardinería
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => cambiarSemana(-1)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', transition: 'all 0.2s' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => cambiarSemana(1)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', transition: 'all 0.2s' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Horario</div>
          <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '0.5rem' }}>6:00 a.m. a 2:00 p.m.</div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trabajador</div>
          <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {user?.nombre_completo || 'Cargando...'}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Semana del</div>
          <div style={{ color: '#fff', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {semanaInicio} - {semanaFinFormatted}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rol</div>
          <div style={{ color: '#60a5fa', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 500 }}>
            {user?.rol === 'admin' ? 'Administrador' : 'Trabajador'}
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(6, 1fr) 120px',
            gap: 0,
          }}
        >
          {/* Header Row */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', fontWeight: 700, textAlign: 'center', fontSize: '0.85rem', color: '#38bdf8' }}>
            Hora
          </div>
          {DIAS.map((dia) => {
            const fecha = new Date(weekStart);
            const dayIndex = DIAS.indexOf(dia);
            fecha.setDate(weekStart.getDate() + dayIndex);
            return (
              <div key={dia} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                <div>{dia}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{formatDayHeader(fecha)}</div>
              </div>
            );
          })}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', fontWeight: 700, textAlign: 'center', fontSize: '0.85rem', color: '#fbbf24' }}>
            Obs.
          </div>

          {/* Time Rows */}
          {HORAS.map((hora) => (
            <div key={`row-${hora}`} style={{ display: 'contents' }}>
              {/* Time Label */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                {hora}
              </div>

              {/* Day Cells */}
              {DIAS.map((dia) => {
                const horaStart = hora.split(' - ')[0];
                const key = `${dia}|${horaStart}`;
                const cellTareas = tareasPorCelda.get(key) || [];
                const isSelected = selectedCell?.dia === dia && selectedCell?.hora === hora;

                return (
                  <div
                    key={`${dia}-${hora}`}
                    onDragOver={(e) => handleDragOver(e as any)}
                    onDrop={(e) => handleDrop(e as any, dia, hora)}
                    onClick={() => {
                      if (!selectedCell) {
                        setSelectedCell({ dia, hora });
                      }
                    }}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '0.75rem',
                      minHeight: '100px',
                      background: isSelected ? 'rgba(56,189,248,0.1)' : draggedTaskId ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                    }}
                  >
                    {cellTareas.length === 0 && !isSelected ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        —
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {cellTareas.map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, t.id)}
                            style={{
                              background: t.completado ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                              border: `1px solid ${t.completado ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
                              borderRadius: '0.4rem',
                              padding: '0.5rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              cursor: draggedTaskId === t.id ? 'grabbing' : 'grab',
                              opacity: draggedTaskId === t.id ? 0.5 : 1,
                              transition: 'all 0.2s ease',
                              transform: draggedTaskId === t.id ? 'scale(0.95)' : 'scale(1)',
                            }}
                          >
                            <input
                              type='checkbox'
                              checked={t.completado}
                              onChange={() => handleToggleCompletado(t.id)}
                              style={{ marginTop: '0.15rem', cursor: 'pointer', accentColor: '#34d399' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ textDecoration: t.completado ? 'line-through' : 'none', color: '#fff' }}>
                                {t.descripcion}
                              </div>
                              {user?.rol === 'admin' && t.usuarioNombre && (
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                                  {t.usuarioNombre}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEliminar(t.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                transition: 'all 0.2s',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Task Form */}
                    {isSelected && (
                      <div
                        style={{
                          background: '#0b0f1a',
                          border: '2px solid #38bdf8',
                          borderRadius: '0.4rem',
                          padding: '0.75rem',
                          display: 'grid',
                          gap: '0.5rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <textarea
                          value={newTaskDesc}
                          onChange={(e) => setNewTaskDesc(e.target.value)}
                          placeholder='Nueva tarea...'
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.5rem',
                            borderRadius: '0.3rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontFamily: 'inherit',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            resize: 'vertical',
                            minHeight: '50px',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={handleGuardarTarea}
                            style={{
                              flex: 1,
                              background: '#34d399',
                              color: '#0b0f1a',
                              border: 'none',
                              borderRadius: '0.3rem',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              transition: 'all 0.2s',
                            }}
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCell(null);
                              setNewTaskDesc('');
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '0.3rem',
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Observations Cell */}
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', minHeight: '100px', background: 'rgba(255,255,255,0.01)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                —
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.5rem', color: '#fbbf24', fontSize: '0.9rem' }}>
          {statusMessage}
        </div>
      )}

      {/* Summary Panel */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {/* Connection Status */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Estado de conexión
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isOnline ? '#34d399' : '#f87171',
                animation: isOnline ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
              }}
            />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: isOnline ? '#34d399' : '#f87171' }}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>
          </div>
        </div>

        {/* Weekly Tasks */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s backwards' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Tareas esta semana
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem' }}>
              {tareasSemana.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              {tareasCompletadas} completadas
            </div>
          </div>
        </div>

        {/* Most Productive Hour */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.2s backwards' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Hora más productiva
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>
              {horasMasProductiva || '—'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              {horasMasProductiva ? `${tareasSemana.filter((t) => t.hora === horasMasProductiva).length} tareas` : 'Sin tareas'}
            </div>
          </div>
        </div>

        {/* Average per Day */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.3s backwards' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Promedio por día
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem' }}>
              {promedioPorDia}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              tareas/día
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.4s backwards' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Tasa de completación
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem' }}>
              {tareasSemana.length > 0 ? Math.round((tareasCompletadas / tareasSemana.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              de las tareas
            </div>
          </div>
        </div>

        {/* Week Info */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.5s backwards' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Información
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <div>{semanaInicio} — {semanaFinFormatted}</div>
            <div style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>
              {user?.nombre_completo || 'Trabajador'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        div[draggable="true"]:hover {
          filter: brightness(1.1);
        }

        button:hover {
          filter: brightness(1.15);
        }
      `}</style>
    </div>
  );
}
