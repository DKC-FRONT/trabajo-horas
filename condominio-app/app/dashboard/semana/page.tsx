'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/client';

type SemanaTarea = {
  id: string;
  semanaKey: string;
  dia: string;
  hora: string;
  descripcion: string;
  createdAt: string;
  synced?: boolean;
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIME_OPTIONS = Array.from({ length: 30 }, (_, index) => {
  const minutos = index * 30;
  const hora = Math.floor(minutos / 60) + 6;
  const minuto = minutos % 60;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
});

function formatTimeLabel(time24: string) {
  const [hh, mm] = time24.split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(hour12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Ajusta domingo a anterior lunes
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDay(date: Date) {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function getSemanaKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMinutes(totalMinutes: number) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function SemanaPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [tareas, setTareas] = useState<SemanaTarea[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [hora, setHora] = useState(TIME_OPTIONS[0]);
  const [dia, setDia] = useState('Lunes');
  const [feedback, setFeedback] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncMessage, setSyncMessage] = useState('');

  const semanaKey = getSemanaKey(weekStart);

  useEffect(() => {
    const raw = window.localStorage.getItem('semana-tareas');
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SemanaTarea[];
      setTareas(saved);
    } catch (err) {
      console.error('Error cargando tareas:', err);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('semana-tareas', JSON.stringify(tareas));
  }, [tareas]);

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

  const mergeTaskLists = (existing: SemanaTarea[], incoming: SemanaTarea[]) => {
    const merged = new Map(existing.map((task) => [task.id, task]));
    incoming.forEach((task) => {
      merged.set(task.id, { ...merged.get(task.id), ...task, synced: true });
    });
    return Array.from(merged.values());
  };

  const syncPendingTasks = useCallback(async () => {
    const pending = tareas.filter((t) => !t.synced);
    if (pending.length === 0) {
      setSyncMessage('Todos los cambios están sincronizados.');
      return;
    }

    try {
      const supabase = createClient();
      const payload = pending.map((t) => ({
        id: t.id,
        semana_key: t.semanaKey,
        dia: t.dia,
        hora: t.hora,
        descripcion: t.descripcion,
        created_at: t.createdAt,
      }));

      const { error } = await supabase.from('tareas_semana').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('No se pudo sincronizar tareas:', error.message);
        setSyncMessage('Error de sincronización, la tarea queda guardada localmente.');
        return;
      }

      setTareas((prev) => prev.map((task) => (task.synced ? task : { ...task, synced: true })));
      setSyncMessage('Sincronización completada.');
    } catch (err) {
      console.error('Error sincronizando tareas:', err);
      setSyncMessage('Error de sincronización, se conservarán los datos localmente.');
    }
  }, [tareas]);

  useEffect(() => {
    if (!isOnline) {
      setSyncMessage('Sin conexión. Cambios guardados localmente.');
      return;
    }
    setSyncMessage('Conexión disponible. Sincronizando...');
    syncPendingTasks();
  }, [isOnline, syncPendingTasks]);

  const fetchRemoteTasks = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tareas_semana')
        .select('*')
        .eq('semana_key', semanaKey);

      if (error) {
        console.warn('No se pudo cargar tareas remotas:', error.message);
        return;
      }

      if (!data) return;
      const remoteTasks: SemanaTarea[] = data.map((item: any) => ({
        id: item.id,
        semanaKey: item.semana_key,
        dia: item.dia,
        hora: item.hora,
        descripcion: item.descripcion,
        createdAt: item.created_at,
        synced: true,
      }));
      setTareas((prev) => mergeTaskLists(prev, remoteTasks));
    } catch (err) {
      console.error('Error al obtener tareas remotas:', err);
    }
  }, [semanaKey]);

  useEffect(() => {
    if (isOnline) {
      fetchRemoteTasks();
    }
  }, [isOnline, fetchRemoteTasks]);

  const tareasSemana = useMemo(
    () => tareas.filter((t) => t.semanaKey === semanaKey).sort((a, b) => a.hora.localeCompare(b.hora)),
    [tareas, semanaKey]
  );

  const tareasPorDia = useMemo(() => {
    return DIAS.map((nombre, index) => {
      const fecha = new Date(weekStart);
      fecha.setDate(weekStart.getDate() + index);
      return {
        nombre,
        fecha: formatDay(fecha),
        tareas: tareasSemana.filter((t) => t.dia === nombre),
      };
    });
  }, [tareasSemana, weekStart]);

  const handleGuardar = () => {
    if (!descripcion.trim()) {
      setFeedback('Escribe una tarea antes de guardar.');
      return;
    }
    const nueva: SemanaTarea = {
      id: `${semanaKey}-${dia}-${hora}-${Date.now()}`,
      semanaKey,
      dia,
      hora,
      descripcion: descripcion.trim(),
      createdAt: new Date().toISOString(),
      synced: isOnline,
    };
    setTareas((prev) => [...prev, nueva]);
    setDescripcion('');
    setFeedback('Tarea guardada correctamente.');
    window.setTimeout(() => setFeedback(''), 2500);
  };

  const handleEliminar = (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
  };

  const cambiarSemana = (offset: number) => {
    const siguiente = new Date(weekStart);
    siguiente.setDate(siguiente.getDate() + offset * 7);
    setWeekStart(getMonday(siguiente));
  };

  const totalTareas = tareasSemana.length;
  const domingoTareas = tareasPorDia.find((b) => b.nombre === 'Domingo')?.tareas.length || 0;

  const promedioPorTrabajo = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    tareasSemana.forEach((t) => {
      const [hh, mm] = t.hora.split(':').map(Number);
      const minutes = hh * 60 + mm;
      const current = map.get(t.descripcion) ?? { sum: 0, count: 0 };
      map.set(t.descripcion, { sum: current.sum + minutes, count: current.count + 1 });
    });
    return Array.from(map.entries()).map(([descripcion, data]) => ({
      descripcion,
      promedio: formatMinutes(Math.round(data.sum / data.count)),
      cantidad: data.count,
    }));
  }, [tareasSemana]);

  return (
    <div style={{ padding: '2.5rem', fontFamily: "'Courier New', monospace", color: '#fff' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' }}>Módulo</p>
          <h1 style={{ margin: '0.35rem 0 0', fontSize: '2rem', fontWeight: 700 }}>Semana de tareas</h1>
          <p style={{ margin: '0.75rem 0 0', maxWidth: '44rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>
            Registra y revisa tareas diarias con horario y descripción para la semana seleccionada.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => cambiarSemana(-1)}
            style={{ background: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', padding: '0.9rem 1rem', borderRadius: '0.65rem', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} /> Semana anterior
          </button>
          <button
            onClick={() => cambiarSemana(1)}
            style={{ background: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', padding: '0.9rem 1rem', borderRadius: '0.65rem', cursor: 'pointer' }}
          >
            Semana siguiente <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <section style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#60a5fa' }}>Semana</div>
              <div style={{ marginTop: '0.35rem', fontSize: '1rem', fontWeight: 700 }}>{DIAS[0]} — {DIAS[6]}</div>
            </div>
            <CalendarCheck size={28} color='#38bdf8' />
          </div>

          <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gap: '1rem' }}>
            {tareasPorDia.map((bloque) => (
              <div key={bloque.nombre} style={{ borderRadius: '0.95rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{bloque.nombre}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.2rem' }}>{bloque.fecha}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>{bloque.tareas.length} tareas</div>
                </div>
                {bloque.tareas.length === 0 ? (
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Sin tareas para este día.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {bloque.tareas.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', padding: '0.85rem' }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{t.hora}</div>
                          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{t.descripcion}</div>
                        </div>
                        <button onClick={() => handleEliminar(t.id)} style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }} title='Eliminar tarea'>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <aside style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Agregar tarea</div>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                Día
                <select value={dia} onChange={(e) => setDia(e.target.value)} style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
                  {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                Hora
                <select value={hora} onChange={(e) => setHora(e.target.value)} style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer' }}>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option} value={option} style={{ background: '#0b1220', color: '#fff' }}>{formatTimeLabel(option)}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                Tarea
                <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder='Ej: Revisar instalaciones de agua' style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', resize: 'vertical' }} />
              </label>
              <button onClick={handleGuardar} style={{ width: '100%', background: '#38bdf8', color: '#111827', border: 'none', borderRadius: '0.85rem', padding: '0.95rem 1rem', fontWeight: 700, cursor: 'pointer' }}>
                Guardar tarea
              </button>
              {feedback ? (
                <div style={{ fontSize: '0.82rem', color: '#a5f3fc', minHeight: '1rem' }}>{feedback}</div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', minHeight: '1rem' }}>Selecciona día, hora y describe la tarea.</div>
              )}
            </div>
          </div>

          <div style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fbbf24' }}>Resumen</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{totalTareas} tareas</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}</div>
            </div>
            <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>Las tareas se guardan localmente en tu navegador y se sincronizan con la base de datos cuando hay internet.</p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                <span>Estado de conexión</span>
                <span style={{ color: isOnline ? '#4ade80' : '#f87171' }}>{isOnline ? 'En línea' : 'Offline'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                <span>Sincronización</span>
                <span>{syncMessage}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.85rem', padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' }}>Domingo</div>
                <div style={{ marginTop: '0.45rem', fontSize: '0.95rem', fontWeight: 700, color: domingoTareas === 0 ? '#f87171' : '#60a5fa' }}>
                  {domingoTareas === 0 ? 'Los domingos no viene nadie' : `${domingoTareas} tarea(s) programada(s)`}
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#60a5fa', marginBottom: '0.9rem' }}>Promedio de horarios por trabajo</div>
            {promedioPorTrabajo.length === 0 ? (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>Aún no hay tareas para calcular el promedio.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {promedioPorTrabajo.map((item) => (
                  <div key={item.descripcion} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.8rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#ffffff' }}>{item.descripcion}</span>
                    <span style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>{item.promedio}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>{item.cantidad} vez/veces</div>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
