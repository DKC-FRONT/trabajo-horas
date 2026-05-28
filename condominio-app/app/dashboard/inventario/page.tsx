'use client';

import { useState, useEffect } from 'react';
import { PackageOpen, ShieldAlert, Plus, Minus, Trash2, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Layers, Edit2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ALLOWED_EMAILS = [
  'admin@florida.com',
  'sandra@florida.com',
  'trabajador@florida.com',
  'oscar@florida.com'
];

type Item = {
  id: number;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
};

type Movimiento = {
  id: number;
  item_id: number;
  tipo: string;
  cantidad: number;
  responsable_email: string;
  observaciones: string;
  fecha: string;
  inventario_items?: {
    nombre: string;
    unidad_medida: string;
  };
};

export default function InventarioPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Estados de inventario
  const [items, setItems] = useState<Item[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Filtro por categoría
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Edición inline de artículos
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ nombre: '', categoria: '', unidad_medida: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Formulario Nuevo Artículo
  const [showNewForm, setShowNewForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('herramienta');
  const [newItemUnit, setNewItemUnit] = useState('unidad');
  const [creating, setCreating] = useState(false);

  // Selector interactivo de movimientos
  const [actionItem, setActionItem] = useState<{ id: number, type: 'entrada' | 'salida' | 'baja' } | null>(null);
  const [actionAmount, setActionAmount] = useState<number | string>('');
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  const checkAuth = async () => {
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.email) {
        router.push('/login');
        return;
      }

      if (!ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        setAccessDenied(true);
      } else {
        setUserEmail(user.email);
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventario_items')
        .select('*')
        .order('nombre');
      
      const { data: movs } = await supabase
        .from('inventario_movimientos')
        .select('*, inventario_items(nombre, unidad_medida)')
        .order('fecha', { ascending: false })
        .limit(100);

      if (!error && data) setItems(data);
      if (movs) setMovimientos(movs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    setCreating(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('inventario_items')
        .insert([{
          nombre: newItemName.toUpperCase(),
          categoria: newItemCat,
          unidad_medida: newItemUnit,
          stock_actual: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setItems([...items, data]);
      setNewItemName('');
      setShowNewForm(false);
    } catch (err: any) {
      alert(err.message === 'duplicate key value violates unique constraint "inventario_items_nombre_key"' ? '¡Ese artículo ya existe!' : 'Error al crear artículo');
    } finally {
      setCreating(false);
    }
  };

  const submitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionItem || !actionAmount || isNaN(Number(actionAmount)) || Number(actionAmount) <= 0) return;
    
    setSubmittingAction(true);
    const amountNum = Number(actionAmount);
    
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      const itemRef = items.find(i => i.id === actionItem.id);
      if (!itemRef) return;

      // 1. Validar la salida
      if ((actionItem.type === 'salida' || actionItem.type === 'baja') && itemRef.stock_actual < amountNum) {
        alert("¡Error: No hay suficiente stock para hacer esa salida!");
        setSubmittingAction(false);
        return;
      }

      // 2. Ejecutar la matemática de actualización de stock
      let newStock = itemRef.stock_actual;
      if (actionItem.type === 'entrada') newStock += amountNum;
      else newStock -= amountNum; // salida o baja

      // 3. Insertar Movimiento
      const { error: histErr } = await supabase
        .from('inventario_movimientos')
        .insert([{
          item_id: actionItem.id,
          tipo: actionItem.type,
          cantidad: amountNum,
          responsable_email: userEmail,
          observaciones: actionNotes
        }]);
      
      if (histErr) throw histErr;

      // 4. Actualizar Tabla Maestro
      const { error: updErr } = await supabase
        .from('inventario_items')
        .update({ stock_actual: newStock })
        .eq('id', actionItem.id);

      if (updErr) throw updErr;

      // Actualizar vista local sin recargar (Inyectar el nuevo movimiento arriba)
      setItems(items.map(i => i.id === actionItem.id ? { ...i, stock_actual: newStock } : i));
      
      const prevDate = new Date().toISOString();
      setMovimientos([{
        id: Date.now(),
        item_id: actionItem.id,
        tipo: actionItem.type,
        cantidad: amountNum,
        responsable_email: userEmail,
        observaciones: actionNotes,
        fecha: prevDate,
        inventario_items: { nombre: itemRef.nombre, unidad_medida: itemRef.unidad_medida }
      }, ...movimientos]);

      setActionItem(null);
      setActionAmount('');
      setActionNotes('');
      
    } catch (err: any) {
      alert("Falla de conexión al registrar: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (userEmail !== 'admin@florida.com') {
      alert('Solo el Administrador Principal tiene permiso para borrar del catálogo.');
      return;
    }
    
    if (!window.confirm(`¿Estás completamente seguro de BORRAR "${itemName}" de la base de datos?\nSe borrará también de todo el historial y no se puede deshacer.`)) {
      return;
    }

    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('inventario_items')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      setMovimientos(movimientos.filter(m => m.item_id !== itemId));
    } catch (err: any) {
      alert("Error al intentar borrar el producto: " + err.message);
    }
  };

  const handleStartEdit = (item: Item) => {
    setEditingItemId(item.id);
    setEditFields({ nombre: item.nombre, categoria: item.categoria, unidad_medida: item.unidad_medida });
    // Cerrar cualquier acción de movimiento abierta
    setActionItem(null);
    setActionAmount('');
    setActionNotes('');
  };

  const handleSaveEdit = async (itemId: number) => {
    if (!editFields.nombre.trim()) return;
    setSavingEdit(true);
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { error } = await supabase
        .from('inventario_items')
        .update({
          nombre: editFields.nombre.toUpperCase().trim(),
          categoria: editFields.categoria,
          unidad_medida: editFields.unidad_medida,
        })
        .eq('id', itemId);
      if (error) throw error;
      setItems(items.map(i => i.id === itemId
        ? { ...i, nombre: editFields.nombre.toUpperCase().trim(), categoria: editFields.categoria, unidad_medida: editFields.unidad_medida }
        : i
      ));
      setEditingItemId(null);
    } catch (err: any) {
      alert('Error al guardar cambios: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditObservation = async (movId: number, oldText: string) => {
    if (userEmail !== 'admin@florida.com') return;
    
    const newText = window.prompt("Modificar la observación del registro:", oldText);
    if (newText === null || newText === oldText) return;

    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('inventario_movimientos')
        .update({ observaciones: newText })
        .eq('id', movId);
        
      if (error) throw error;

      setMovimientos(movimientos.map(m => m.id === movId ? { ...m, observaciones: newText } : m));
    } catch (err: any) {
      alert("Error al intentar modificar el registro: " + err.message);
    }
  };

  if (!mounted || loadingUser) return null;

  if (accessDenied) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
        <ShieldAlert size={64} color="#f87171" style={{ margin: '0 auto 1.5rem' }} />
        <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>SISTEMA CLASIFICADO</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
          La cuenta detectada carece del nivel de seguridad requerido para operar los sistemas del Kardex. <br/><br/>
          Por favor regrese al panel de control principal.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem', fontFamily: "'Courier New', monospace", maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
             <PackageOpen size={24} color="#a78bfa" />
             <h1 style={{ fontSize: 'clamp(1.3rem, 5vw, 1.8rem)', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
               KARDEX DE ALMACÉN
             </h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.02em' }}>
             Control militar de existencias operado por: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{userEmail}</span>
          </p>
        </div>
        {!showNewForm && (
          <button onClick={() => setShowNewForm(true)} style={{
            background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)',
            color: '#a78bfa', padding: '0.6rem 1.2rem', fontSize: '0.75rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: "'Courier New', monospace", fontWeight: 'bold', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            flexShrink: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.25)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.15)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <Plus size={16} /> Alta al Catálogo
          </button>
        )}
      </div>

      {showNewForm && (
        <form onSubmit={handleCreateItem} style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid #a78bfa', padding: '1.5rem', 
          marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>NOMBRE DE LA HERRAMIENTA O PRODUCTO</label>
            <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} required autoFocus placeholder="Ej. TIJERAS PODADORAS" style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>CATEGORÍA</label>
            <select value={newItemCat} onChange={e => setNewItemCat(e.target.value)} style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}>
              <option value="herramienta">Herramienta</option>
              <option value="aseo">Aseo</option>
              <option value="consumible">Consumible</option>
              <option value="gasolina">Gasolina</option>
              <option value="epp">Protección (EPP)</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>UNIDAD MEDIDA</label>
            <select value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}>
              <option value="unidad">Unidades</option>
              <option value="galones">Galones</option>
              <option value="litros">Litros</option>
              <option value="cajas">Cajas</option>
              <option value="pares">Pares</option>
              <option value="bolsas">Bolsas</option>
              <option value="rollos">Rollos</option>
              <option value="frascos">Frascos</option>
              <option value="kilos">Kilos</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => setShowNewForm(false)} 
              style={{ 
                background: 'rgba(248,113,113,0.15)', 
                border: '1px solid rgba(248,113,113,0.4)', 
                color: '#f87171', 
                padding: '0.6rem 1.2rem', 
                fontSize: '0.8rem', 
                fontWeight: 'bold', 
                fontFamily: "'Courier New', monospace", 
                letterSpacing: '0.1em', 
                textTransform: 'uppercase', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.25)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={creating} 
              style={{ 
                background: creating ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.15)', 
                border: creating ? '1px solid rgba(167,139,250,0.2)' : '1px solid rgba(167,139,250,0.4)', 
                color: creating ? 'rgba(167,139,250,0.5)' : '#a78bfa', 
                padding: '0.6rem 1.2rem', 
                fontSize: '0.8rem', 
                fontWeight: 'bold', 
                fontFamily: "'Courier New', monospace", 
                letterSpacing: '0.1em', 
                textTransform: 'uppercase', 
                cursor: creating ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => { if (!creating) { e.currentTarget.style.background = 'rgba(167,139,250,0.25)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { if (!creating) { e.currentTarget.style.background = 'rgba(167,139,250,0.15)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {creating ? <RefreshCw className="spin" size={16} /> : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* ── Filtro por Categoría ── */}
      {!loadingItems && items.length > 0 && (() => {
        const CATS = [
          { key: '', label: 'Todas', emoji: '📦' },
          { key: 'herramienta', label: 'Herramientas', emoji: '🔧' },
          { key: 'aseo', label: 'Aseo', emoji: '🧹' },
          { key: 'consumible', label: 'Consumibles', emoji: '🪣' },
          { key: 'gasolina', label: 'Gasolina', emoji: '⛽' },
          { key: 'epp', label: 'EPP', emoji: '🦺' },
          { key: 'otro', label: 'Otros', emoji: '🗂' },
        ];
        return (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {CATS.map(cat => {
              const count = cat.key === '' ? items.length : items.filter(i => i.categoria === cat.key).length;
              if (cat.key !== '' && count === 0) return null;
              const isActive = filtroCategoria === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setFiltroCategoria(cat.key)}
                  style={{
                    background: isActive ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isActive ? '#a78bfa' : 'rgba(255,255,255,0.12)'}`,
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer',
                    borderRadius: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.18s',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                  <span style={{
                    background: isActive ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    color: isActive ? '#000' : 'rgba(255,255,255,0.5)',
                    borderRadius: '1rem',
                    padding: '0 0.4rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    minWidth: '18px',
                    textAlign: 'center',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {loadingItems ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#a78bfa' }}>
          <RefreshCw className="spin" size={32} style={{ margin: '0 auto 1rem' }} />
          Espere un momento...
        </div>
      ) : items.length === 0 ? (
        <div style={{ border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          <Layers size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          El almacén está vacío. Agregue herramientas o productos usando el botón superior.
        </div>
      ) : (() => {
        const itemsFiltrados = filtroCategoria ? items.filter(i => i.categoria === filtroCategoria) : items;
        if (itemsFiltrados.length === 0) return (
          <div style={{ border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)', borderRadius: '0.5rem' }}>
            <Layers size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            No hay artículos en esta categoría.
          </div>
        );
        return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
          {itemsFiltrados.map(item => {
            const isCritical = item.stock_actual <= 0;
            const isWarning = item.stock_actual > 0 && item.stock_actual <= 2;
            const statusColor = isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80';

            const isActiveItem = actionItem?.id === item.id;

            return (
              <div key={item.id} style={{ 
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${statusColor}40`, 
                padding: '1.25rem', position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: statusColor }} />
                
                {/* ── Cabecera tarjeta: nombre + acciones de edición ── */}
                {editingItemId === item.id ? (
                  // ── Formulario edición inline ──
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.6rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem', fontWeight: 700 }}>✏️ Editando artículo</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={editFields.nombre}
                        onChange={e => setEditFields(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre del artículo"
                        style={{ background: '#0a0a0f', border: '1px solid #a78bfa', color: '#fff', padding: '0.5rem 0.75rem', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select value={editFields.categoria} onChange={e => setEditFields(f => ({ ...f, categoria: e.target.value }))}
                          style={{ flex: 1, background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.45rem', fontFamily: 'inherit', fontSize: '0.75rem', outline: 'none' }}>
                          <option value="herramienta">Herramienta</option>
                          <option value="aseo">Aseo</option>
                          <option value="consumible">Consumible</option>
                          <option value="gasolina">Gasolina</option>
                          <option value="epp">EPP</option>
                          <option value="otro">Otro</option>
                        </select>
                        <select value={editFields.unidad_medida} onChange={e => setEditFields(f => ({ ...f, unidad_medida: e.target.value }))}
                          style={{ flex: 1, background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '0.45rem', fontFamily: 'inherit', fontSize: '0.75rem', outline: 'none' }}>
                          <option value="unidad">Unidades</option>
                          <option value="galones">Galones</option>
                          <option value="litros">Litros</option>
                          <option value="cajas">Cajas</option>
                          <option value="pares">Pares</option>
                          <option value="bolsas">Bolsas</option>
                          <option value="rollos">Rollos</option>
                          <option value="frascos">Frascos</option>
                          <option value="kilos">Kilos</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setEditingItemId(null)}
                          style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '0.4rem', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>Cancelar</button>
                        <button onClick={() => handleSaveEdit(item.id)} disabled={savingEdit}
                          style={{ flex: 1, background: '#a78bfa', color: '#000', fontWeight: 700, border: 'none', padding: '0.4rem', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                          {savingEdit ? '...' : '💾 Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', wordBreak: 'break-word' }}>{item.nombre}</h3>
                        {/* Editar: todos los usuarios con acceso */}
                        <button onClick={() => handleStartEdit(item)} title="Editar artículo"
                          style={{ background: 'transparent', border: 'none', color: 'rgba(167,139,250,0.6)', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(167,139,250,0.6)')}>
                          <Edit2 size={13} />
                        </button>
                        {/* Eliminar: solo admin */}
                        {userEmail === 'admin@florida.com' && (
                          <button onClick={() => handleDeleteItem(item.id, item.nombre)} title="Eliminar Producto del Catálogo"
                            style={{ background: 'transparent', border: 'none', color: 'rgba(248,113,113,0.5)', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}>
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.1rem' }}>
                        {item.categoria === 'aseo' ? '🧹' : item.categoria === 'herramienta' ? '🔧' : item.categoria === 'gasolina' ? '⛽' : item.categoria === 'epp' ? '🦺' : item.categoria === 'consumible' ? '🪣' : '🗂'} {item.categoria}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: statusColor, lineHeight: 1 }}>{item.stock_actual}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{item.unidad_medida}</div>
                    </div>
                  </div>
                )}

                {/* Acciones Rápidas */}
                {!isActiveItem ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <button onClick={() => setActionItem({ id: item.id, type: 'entrada' })} style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', padding: '0.5rem', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                      <ArrowDownToLine size={12} /> INGRESA
                    </button>
                    <button onClick={() => setActionItem({ id: item.id, type: 'salida' })} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '0.5rem', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }} disabled={isCritical}>
                      <ArrowUpFromLine size={12} /> SALE
                    </button>
                    <button onClick={() => setActionItem({ id: item.id, type: 'baja' })} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '0.5rem', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }} disabled={isCritical}>
                      <Trash2 size={12} /> DAÑO
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitTransaction} style={{ background: '#000', padding: '1rem', border: `1px dashed ${actionItem.type === 'entrada' ? '#4ade80' : actionItem.type === 'salida' ? '#fbbf24' : '#f87171'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#fff', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      {actionItem.type === 'entrada' ? '➕ Registrar Ingreso' : actionItem.type === 'salida' ? '➖ Registrar Salida de Almacén' : '🛑 Registrar Daño / Pérdida'}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="number" min="0.1" step="0.1" value={actionAmount} onChange={e => setActionAmount(e.target.value)} placeholder="0.0" required style={{ width: '80px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center', fontFamily: 'inherit', padding: '0.5rem' }} autoFocus />
                      <input type="text" value={actionNotes} onChange={e => setActionNotes(e.target.value)} placeholder="Motivo o nombre del responsable..." required style={{ flex: 1, background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontFamily: 'inherit', padding: '0.5rem' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="button" onClick={() => { setActionItem(null); setActionAmount(''); setActionNotes(''); }} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.4rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'inherit' }}>Cancelar</button>
                      <button type="submit" disabled={submittingAction} style={{ flex: 1, background: actionItem.type === 'entrada' ? '#4ade80' : actionItem.type === 'salida' ? '#fbbf24' : '#f87171', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.4rem', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'inherit' }}>
                        {submittingAction ? '...' : 'Confirmar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* HISTORIAL TABULAR */}
      {!loadingItems && movimientos.length > 0 && (
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            REGISTRO CRONOLÓGICO DE MOVIMIENTOS
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Fecha y Hora</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Producto</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Cant.</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Responsable (Operador)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 600 }}>Motivo / Observación</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, idx) => {
                  const isEntrada = m.tipo === 'entrada';
                  const isBaja = m.tipo === 'baja';
                  const tColor = isEntrada ? '#4ade80' : isBaja ? '#f87171' : '#fbbf24';
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', color: '#fff', whiteSpace: 'nowrap' }}>
                        {new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.75rem', color: tColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {isEntrada ? '➕ ENTRADA' : isBaja ? '🗑 DAÑO/PÉRDIDA' : '➖ SALIDA'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#fff', fontWeight: 'bold' }}>
                        {m.inventario_items?.nombre || 'Producto Eliminado'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#fff' }}>
                        {m.cantidad} <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{m.inventario_items?.unidad_medida}</span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#a78bfa' }}>
                        {m.responsable_email}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{m.observaciones || '--'}</span>
                          {userEmail === 'admin@florida.com' && (
                            <button onClick={() => handleEditObservation(m.id, m.observaciones)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
