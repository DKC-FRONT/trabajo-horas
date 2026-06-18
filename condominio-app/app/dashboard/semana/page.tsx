'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Trash2, X } from 'lucide-react';
import { saveAs } from 'file-saver';
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
  email?: string;
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getHoraStart(horaStr: string) {
  const parts = horaStr.split('-')[0].trim().split(':');
  if (parts.length > 0 && parts[0]) {
    const h = parts[0].padStart(2, '0');
    const m = (parts[1] || '00').padEnd(2, '0');
    return `${h}:${m}`;
  }
  return '06:00';
}

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

function sortHoras(horasArr: string[]) {
  return [...horasArr].sort((a, b) => {
    const aStart = getHoraStart(a);
    const bStart = getHoraStart(b);
    return aStart.localeCompare(bStart);
  });
}

function formatHoraLabel(timeStr: string) {
  const parts = timeStr.trim().split(':');
  if (parts.length > 0 && parts[0]) {
    let h = parseInt(parts[0]);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
}

export default function SemanaPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tareas, setTareas] = useState<SemanaTarea[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ dia: string; hora: string } | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [repeatEveryDay, setRepeatEveryDay] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Horas del Cronograma
  const [horas, setHoras] = useState<string[]>(() => {
    let rawHoras = [];
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('semana_horas');
      if (saved) {
        try { rawHoras = JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    if (rawHoras.length === 0) {
      rawHoras = Array.from({ length: 8 }, (_, i) => {
        const h = 6 + i;
        return `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
      });
    }
    return sortHoras(rawHoras);
  });

  // Persistir horas
  useEffect(() => {
    localStorage.setItem('semana_horas', JSON.stringify(horas));
  }, [horas]);

  // Edición de horas
  const [editingHoraIndex, setEditingHoraIndex] = useState<number | null>(null);
  const [editingHoraValue, setEditingHoraValue] = useState('');

  // Cola de sincronización offline
  const [semanaSyncQueue, setSemanaSyncQueue] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('semana_sync_queue');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return [];
  });

  // Persistir cola
  useEffect(() => {
    localStorage.setItem('semana_sync_queue', JSON.stringify(semanaSyncQueue));
  }, [semanaSyncQueue]);

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

  const [syncing, setSyncing] = useState(false);

  const handleSincronizarSemana = async () => {
    if (semanaSyncQueue.length === 0 || syncing) return;
    setSyncing(true);
    setStatusMessage('Sincronizando tareas...');

    const tempIdMap: Record<string, string> = {}; // Mapeo de tempId a ID real
    const remainingQueue = [...semanaSyncQueue];

    try {
      while (remainingQueue.length > 0) {
        const action = remainingQueue[0];

        if (action.type === 'create') {
          const response = await fetch('/api/semana', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || 'Fallo al sincronizar creación.');

          if (data && data.id) {
            tempIdMap[action.tempId] = data.id;
          }
        }
        else if (action.type === 'toggle') {
          const realId = action.id.startsWith('temp-') ? tempIdMap[action.id] : action.id;
          if (realId) {
            const response = await fetch('/api/semana', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: realId, completado: action.completado }),
            });
            if (!response.ok) throw new Error('Fallo al sincronizar completado.');
          }
        }
        else if (action.type === 'delete') {
          const realId = action.id.startsWith('temp-') ? tempIdMap[action.id] : action.id;
          if (realId) {
            const response = await fetch('/api/semana', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: realId }),
            });
            if (!response.ok) throw new Error('Fallo al sincronizar eliminación.');
          }
        }

        remainingQueue.shift(); // Quitar el elemento exitoso
      }

      setSemanaSyncQueue([]);
      localStorage.removeItem('semana_sync_queue');
      setStatusMessage('¡Sincronización exitosa!');
      await fetchTasks();
    } catch (err: any) {
      console.error('Error durante la sincronización:', err);
      setSemanaSyncQueue(remainingQueue);
      setStatusMessage(`Error al sincronizar: ${err.message}. Volviendo a encolar.`);
    } finally {
      setSyncing(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/semana?semanaKey=${encodeURIComponent(semanaKey)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al cargar tareas.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al cargar tareas.');
      }
      const loaded = (data || []).map((item: any) => ({
        id: item.id,
        semanaKey: item.semana_key,
        dia: item.dia,
        hora: item.hora,
        descripcion: item.descripcion,
        usuarioId: item.usuario_id,
        usuarioNombre: item.usuario_nombre,
        completado: item.completado ?? false,
        createdAt: item.created_at,
      }));
      setTareas(loaded);

      // Guardar en caché
      localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(loaded));
    } catch (err: any) {
      console.error('Error fetchTasks:', err);

      // Cargar desde caché en caso de fallo (offline)
      const cached = localStorage.getItem(`semana_tasks_cache_${semanaKey}`);
      if (cached) {
        try {
          setTareas(JSON.parse(cached));
          setStatusMessage('Cargado desde caché local (sin conexión).');
          return;
        } catch { }
      }
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
        setUser({ id: authUser.id, rol: 'trabajador', nombre_completo: authUser.email || undefined, email: authUser.email });
      } else {
        setUser({ ...(profile as UserProfile), email: authUser.email });
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err);
    }
  };

  const handleGuardarTarea = async () => {
    if (!selectedCell || !newTaskDesc.trim() || !user) return;

    const start = getHoraStart(selectedCell.hora);
    const hora = `${start}:00`;

    const diasAGuardar = repeatEveryDay ? DIAS : [selectedCell.dia];
    setStatusMessage('Guardando tarea(s)...');

    let nuevasTareas = [...tareas];
    const newSyncQueueActions: any[] = [];
    
    // Preparar tareas locales
    const tareasParaGuardar = diasAGuardar.map((dia) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        nuevaTareaLocal: {
          id: tempId,
          semanaKey,
          dia,
          hora,
          descripcion: newTaskDesc.trim(),
          usuarioId: user.id,
          usuarioNombre: user.nombre_completo || 'Trabajador',
          completado: false,
          createdAt: new Date().toISOString()
        },
        action: { type: 'create', tempId, data: { semanaKey, dia, hora, descripcion: newTaskDesc.trim() } }
      };
    });

    tareasParaGuardar.forEach(item => {
      nuevasTareas.push(item.nuevaTareaLocal);
      newSyncQueueActions.push(item.action);
    });

    if (!isOnline) {
      setSemanaSyncQueue(prev => [...prev, ...newSyncQueueActions]);
      setTareas(nuevasTareas);
      localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(nuevasTareas));

      setNewTaskDesc('');
      setSelectedCell(null);
      setRepeatEveryDay(false);
      setStatusMessage('Guardado localmente. Se sincronizará al recuperar conexión.');
      return;
    }

    try {
      // Guardar en servidor
      const promesas = diasAGuardar.map(dia => 
        fetch('/api/semana', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            semanaKey,
            dia,
            hora,
            descripcion: newTaskDesc.trim(),
          }),
        }).then(async res => {
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error || 'Error al guardar');
          if (!data || !data.id) throw new Error('No se recibieron datos');
          return {
            id: data.id,
            semanaKey: data.semana_key,
            dia: data.dia,
            hora: data.hora,
            descripcion: data.descripcion,
            usuarioId: data.usuario_id,
            usuarioNombre: data.usuario_nombre,
            completado: data.completado ?? false,
            createdAt: data.created_at,
          };
        })
      );

      const savedTasks = await Promise.all(promesas);

      const tareasFinales = [...tareas, ...savedTasks];
      setTareas(tareasFinales);
      localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(tareasFinales));

      setNewTaskDesc('');
      setSelectedCell(null);
      setRepeatEveryDay(false);
      setStatusMessage('');
    } catch (err: any) {
      console.error('Error guardando tareas:', err);
      setStatusMessage(err.message || 'No se pudieron guardar todas las tareas.');
      // En caso de fallo parcial, volvemos a cargar del servidor para consistencia
      fetchTasks();
    }
  };

  const handleToggleCompletado = async (id: string) => {
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea) return;

    const nuevoEstado = !tarea.completado;

    const nuevasTareas = tareas.map((item) => item.id === id ? { ...item, completado: nuevoEstado } : item);
    setTareas(nuevasTareas);
    localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(nuevasTareas));

    if (!isOnline) {
      if (id.startsWith('temp-')) {
        setSemanaSyncQueue(prev => prev.map(item => item.tempId === id ? { ...item, data: { ...item.data, completado: nuevoEstado } } : item));
      } else {
        setSemanaSyncQueue(prev => {
          const filtrado = prev.filter(item => !(item.type === 'toggle' && item.id === id));
          return [...filtrado, { type: 'toggle', id, completado: nuevoEstado }];
        });
      }
      setStatusMessage('Cambio guardado localmente (sin conexión).');
      return;
    }

    try {
      const response = await fetch('/api/semana', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completado: nuevoEstado }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || response.statusText || 'Error al actualizar.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al actualizar.');
      }
    } catch (err: any) {
      console.error('Error actualizando tarea:', err);
      setStatusMessage(err.message || 'No se pudo actualizar la tarea.');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Seguro quieres eliminar esta tarea?')) return;

    const nuevasTareas = tareas.filter((t) => t.id !== id);
    setTareas(nuevasTareas);
    localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(nuevasTareas));

    if (!isOnline) {
      if (id.startsWith('temp-')) {
        setSemanaSyncQueue(prev => prev.filter(item => item.tempId !== id));
      } else {
        setSemanaSyncQueue(prev => {
          const filtrado = prev.filter(item => item.id !== id);
          return [...filtrado, { type: 'delete', id }];
        });
      }
      setStatusMessage('Eliminación guardada localmente (sin conexión).');
      return;
    }

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
        const normalizedHora = t.hora.substring(0, 5);
        const key = `${t.dia}|${normalizedHora}`;
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

    const start = getHoraStart(hora);
    const newHora = `${start}:00`;

    if (tarea.dia === dia && tarea.hora === newHora) {
      setDraggedTaskId(null);
      return;
    }

    // Actualizar localmente de inmediato
    const nuevasTareas = tareas.map((t) => t.id === draggedTaskId ? { ...t, dia, hora: newHora } : t);
    setTareas(nuevasTareas);
    localStorage.setItem(`semana_tasks_cache_${semanaKey}`, JSON.stringify(nuevasTareas));

    if (!isOnline) {
      if (draggedTaskId.startsWith('temp-')) {
        setSemanaSyncQueue(prev => prev.map(item => item.tempId === draggedTaskId ? { ...item, data: { ...item.data, dia, hora: newHora } } : item));
      } else {
        setSemanaSyncQueue(prev => {
          const filtrado = prev.filter(item => !(item.type === 'move' && item.id === draggedTaskId));
          return [...filtrado, { type: 'move', id: draggedTaskId, dia, hora: newHora }];
        });
      }
      setStatusMessage('Tarea movida localmente (sin conexión).');
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
    } catch (err) {
      console.error('Error al mover tarea:', err);
      setStatusMessage('No se pudo mover la tarea');
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setStatusMessage('Generando archivo Excel...');
      const ExcelJS = (await import('exceljs')).default;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cronograma Semanal');

      // Configurar cuadrícula visible
      worksheet.views = [{ showGridLines: true }];

      // Columnas
      worksheet.columns = [
        { header: 'Día', key: 'dia', width: 15 },
        { header: 'Hora', key: 'hora', width: 20 },
        { header: 'Descripción', key: 'descripcion', width: 45 },
        { header: 'Trabajador', key: 'trabajador', width: 25 },
        { header: 'Estado', key: 'estado', width: 15 },
      ];

      // Estilo de cabeceras
      const headerRow = worksheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Azul oscuro elegante
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const diasOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const sortedTareas = [...tareasSemana].sort((a, b) => {
        const dayDiff = diasOrder.indexOf(a.dia) - diasOrder.indexOf(b.dia);
        if (dayDiff !== 0) return dayDiff;
        return a.hora.localeCompare(b.hora);
      });

      sortedTareas.forEach((t) => {
        const row = worksheet.addRow({
          dia: t.dia,
          hora: t.hora.substring(0, 5),
          descripcion: t.descripcion,
          trabajador: t.usuarioNombre || 'Trabajador',
          estado: t.completado ? 'Completado' : 'Pendiente',
        });

        row.height = 24;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'left' : 'center' };
          
          // Bordes sutiles
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };

          // Colores de estado
          if (colNumber === 5) {
            if (t.completado) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF16A34A' } }; // Verde
            } else {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFD97706' } }; // Naranja
            }
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const nombreTrabajador = user?.nombre_completo || 'Trabajador';
      const filename = `Tareas_${nombreTrabajador.replace(/\s+/g, '_')}_Semana_${semanaKey}.xlsx`;
      saveAs(blob, filename);

      setStatusMessage('¡Excel generado y descargado con éxito!');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error: any) {
      console.error('Error al exportar a Excel:', error);
      setStatusMessage(`Error al exportar: ${error.message || error}`);
    }
  };

  const semanaInicio = weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const semanaFin = new Date(weekStart);
  semanaFin.setDate(semanaFin.getDate() + 5);
  const semanaFinFormatted = semanaFin.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#0b0f1a', minHeight: '100vh', color: '#fdf5e6' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.63rem', fontWeight: 700, color: '#fdf5e6' }}>
            Cronograma Semanal
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '1.35rem' }}>
            Personal de Aseo y Apoyo de Jardinería
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {user?.email === 'admin@florida.com' && (
            <button
              onClick={handleExportToExcel}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#fdf5e6',
                fontWeight: 600,
                fontSize: '1.27rem',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Download size={16} />
              Exportar Excel
            </button>
          )}
          <button
            onClick={() => cambiarSemana(-1)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fdf5e6', transition: 'all 0.2s' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => cambiarSemana(1)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fdf5e6', transition: 'all 0.2s' }}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Horario</div>
          <div style={{ color: '#fdf5e6', fontSize: '1.35rem', marginTop: '0.5rem' }}>
            {(() => {
              if (horas.length === 0) return 'Sin horario';
              const startRaw = horas[0].split('-')[0]?.trim() || '';
              const endRaw = horas[horas.length - 1].split('-')[1]?.trim() || '';
              return `${formatHoraLabel(startRaw)} a ${formatHoraLabel(endRaw)}`;
            })()}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trabajador</div>
          <div style={{ color: '#fdf5e6', fontSize: '1.35rem', marginTop: '0.5rem' }}>
            {user?.nombre_completo || 'Cargando...'}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Semana del</div>
          <div style={{ color: '#fdf5e6', fontSize: '1.35rem', marginTop: '0.5rem' }}>
            {semanaInicio} - {semanaFinFormatted}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rol</div>
          <div style={{ color: '#60a5fa', fontSize: '1.35rem', marginTop: '0.5rem', fontWeight: 500 }}>
            {user?.rol === 'admin' ? 'Administrador' : 'Trabajador'}
          </div>
        </div>
      </div>

      {/* Sync Banner for Semana */}
      {semanaSyncQueue.length > 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.8rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>◌</span>
            <div>
              <div style={{ color: '#fbbf24', fontSize: '1.27rem', fontWeight: 700 }}>Sincronización pendiente (Semana)</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.13rem', marginTop: '0.15rem' }}>
                Tienes {semanaSyncQueue.length} acciones guardadas localmente esperando conexión.
              </div>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={handleSincronizarSemana}
              disabled={syncing}
              style={{
                background: '#fbbf24',
                border: 'none',
                color: '#0b0f1a',
                padding: '0.45rem 1rem',
                borderRadius: '0.35rem',
                fontSize: '1.2rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          )}
        </div>
      )}

      {/* Grid Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(6, 1fr)',
            gap: 0,
            minWidth: '1000px',
          }}
        >
          {/* Header Row */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', fontWeight: 700, textAlign: 'center', fontSize: '1.27rem', color: '#38bdf8' }}>
            Hora
          </div>
          {DIAS.map((dia) => {
            const fecha = new Date(weekStart);
            const dayIndex = DIAS.indexOf(dia);
            fecha.setDate(weekStart.getDate() + dayIndex);
            return (
              <div key={dia} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', textAlign: 'center', fontSize: '1.27rem', fontWeight: 700, color: '#fdf5e6' }}>
                <div>{dia}</div>
                <div style={{ fontSize: '1.13rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{formatDayHeader(fecha)}</div>
              </div>
            );
          })}

          {/* Time Rows */}
          {horas.map((hora, index) => {
            const isEditing = editingHoraIndex === index;

            return (
              <div key={`row-${index}`} style={{ display: 'contents' }}>
                {/* Time Label */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.75rem 0.5rem',
                  fontWeight: 700,
                  fontSize: '1.13rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  position: 'relative'
                }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                      <input
                        type="text"
                        value={editingHoraValue}
                        onChange={(e) => setEditingHoraValue(e.target.value)}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid #38bdf8',
                          color: '#fdf5e6',
                          fontSize: '1.05rem',
                          padding: '0.25rem',
                          borderRadius: '0.25rem',
                          textAlign: 'center',
                          width: '100%',
                          outline: 'none',
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            if (editingHoraValue.trim()) {
                              const nuevasHoras = [...horas];
                              nuevasHoras[index] = editingHoraValue.trim();
                              setHoras(sortHoras(nuevasHoras));
                            }
                            setEditingHoraIndex(null);
                          }}
                          style={{
                            background: '#34d399',
                            border: 'none',
                            borderRadius: '0.2rem',
                            color: '#0b0f1a',
                            fontSize: '0.98rem',
                            padding: '0.15rem 0.4rem',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingHoraIndex(null)}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '0.2rem',
                            color: '#fdf5e6',
                            fontSize: '0.98rem',
                            padding: '0.15rem 0.4rem',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <span style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(96,165,250,0.3)', paddingBottom: '2px' }}
                        onClick={() => {
                          setEditingHoraIndex(index);
                          setEditingHoraValue(hora);
                        }}
                        title="Haz clic para editar"
                      >
                        {hora}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`¿Seguro quieres eliminar la fila del horario ${hora}?`)) {
                            setHoras(horas.filter((_, i) => i !== index));
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '0.9rem',
                          marginTop: '0.35rem',
                          cursor: 'pointer',
                          opacity: 0.4,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                {/* Day Cells */}
                {DIAS.map((dia) => {
                  const horaStart = getHoraStart(hora).substring(0, 5);
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
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.13rem', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          —
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {cellTareas.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e as any, t.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: t.completado ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                                border: `1px solid ${t.completado ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
                                borderRadius: '0.4rem',
                                padding: '0.5rem',
                                fontSize: '1.13rem',
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
                                <div style={{ textDecoration: t.completado ? 'line-through' : 'none', color: '#fdf5e6' }}>
                                  {t.descripcion}
                                </div>
                                {user?.rol === 'admin' && t.usuarioNombre && (
                                  <div style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
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
                              fontSize: '1.13rem',
                              padding: '0.5rem',
                              borderRadius: '0.3rem',
                              border: '1px solid rgba(255,255,255,0.1)',
                              fontFamily: 'inherit',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#fdf5e6',
                              resize: 'vertical',
                              minHeight: '50px',
                            }}
                          />
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#fdf5e6',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            marginTop: '0.2rem',
                            padding: '0.2rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '0.3rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={repeatEveryDay}
                              onChange={(e) => setRepeatEveryDay(e.target.checked)}
                              style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: '#38bdf8' }}
                            />
                            Repetir todos los días
                          </label>
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
                                fontSize: '1.13rem',
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
                                color: '#fdf5e6',
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones de acción del horario */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem', gap: '1rem' }}>
        <button
          onClick={() => {
            let nuevoHorario = '14:00 - 15:00';
            if (horas.length > 0) {
              const ultimaHora = horas[horas.length - 1];
              const parts = ultimaHora.split('-')[1]?.trim().split(':') || ['14', '00'];
              const h = parseInt(parts[0]) || 14;
              nuevoHorario = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
            }
            const nuevasHoras = sortHoras([...horas, nuevoHorario]);
            setHoras(nuevasHoras);
            const newIndex = nuevasHoras.indexOf(nuevoHorario);
            setEditingHoraIndex(newIndex >= 0 ? newIndex : nuevasHoras.length - 1);
            setEditingHoraValue(nuevoHorario);
          }}
          style={{
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.4)',
            color: '#38bdf8',
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
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.25)';
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.6)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(56,189,248,0.15)';
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ➕ Agregar Horario
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.5rem', color: '#fbbf24', fontSize: '1.35rem' }}>
          {statusMessage}
        </div>
      )}

      {/* Summary Panel */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {/* Connection Status */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
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
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isOnline ? '#34d399' : '#f87171' }}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>
          </div>
        </div>

        {/* Weekly Tasks */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.1s backwards' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Tareas esta semana
          </div>
          <div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#60a5fa', marginBottom: '0.5rem' }}>
              {tareasSemana.length}
            </div>
            <div style={{ fontSize: '1.27rem', color: 'rgba(255,255,255,0.6)' }}>
              {tareasCompletadas} completadas
            </div>
          </div>
        </div>

        {/* Most Productive Hour */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.2s backwards' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Hora más productiva
          </div>
          <div>
            <div style={{ fontSize: '2.63rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>
              {horasMasProductiva || '—'}
            </div>
            <div style={{ fontSize: '1.27rem', color: 'rgba(255,255,255,0.6)' }}>
              {horasMasProductiva ? `${tareasSemana.filter((t) => t.hora === horasMasProductiva).length} tareas` : 'Sin tareas'}
            </div>
          </div>
        </div>

        {/* Average per Day */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.3s backwards' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Promedio por día
          </div>
          <div>
            <div style={{ fontSize: '2.63rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem' }}>
              {promedioPorDia}
            </div>
            <div style={{ fontSize: '1.27rem', color: 'rgba(255,255,255,0.6)' }}>
              tareas/día
            </div>
          </div>
        </div>

        {/* Connection Rate */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.4s backwards' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Tasa de completación
          </div>
          <div>
            <div style={{ fontSize: '2.63rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.5rem' }}>
              {tareasSemana.length > 0 ? Math.round((tareasCompletadas / tareasSemana.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: '1.27rem', color: 'rgba(255,255,255,0.6)' }}>
              de las tareas
            </div>
          </div>
        </div>

        {/* Week Info */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', animation: 'fadeIn 0.3s ease 0.5s backwards' }}>
          <div style={{ fontSize: '1.13rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: '0.75rem' }}>
            Información
          </div>
          <div style={{ fontSize: '1.27rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
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
