'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Printer, Shield, Save } from 'lucide-react';

type Trabajador = {
  id: string;
  nombre_completo: string;
};

type ItemDotacion = {
  id: number;
  producto: string;
  talla: string;
  marca: string;
  cantidad: number;
  fechaEntrega: string;
};

const MAIN_GREEN = '#2b7a2b';
const ACCENT = '#4ade80';

export default function DotacionPage() {
  const [loading, setLoading] = useState(true);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  
  // Form State
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('');
  const [municipio, setMunicipio] = useState('VILLAVICENCIO');
  
  const [items, setItems] = useState<ItemDotacion[]>([
    { id: 1, producto: '', talla: '', marca: '', cantidad: 1, fechaEntrega: new Date().toISOString().split('T')[0] }
  ]);

  useEffect(() => {
    fetchTrabajadores();
  }, []);

  const fetchTrabajadores = async () => {
    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .eq('rol', 'trabajador')
        .order('nombre_completo');
      if (data) setTrabajadores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trabajadorActual = trabajadores.find(t => t.id === selectedTrabajadorId);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), producto: '', talla: '', marca: '', cantidad: 1, fechaEntrega: new Date().toISOString().split('T')[0] }
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof ItemDotacion, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleImprimir = () => {
    if (!selectedTrabajadorId) {
      alert("Por favor seleccione un trabajador primero.");
      return;
    }
    window.print();
  };

  // Generar 10 filas en total (llenando con vacías si es necesario) para que el impreso luzca formal
  const printableItems = [...items];
  let emptyCounter = 1;
  while (printableItems.length < 10) {
    printableItems.push({ id: -(emptyCounter++), producto: '', talla: '', marca: '', cantidad: 0, fechaEntrega: '' });
  }

  return (
    <div style={{ minHeight: '100%', fontFamily: "'Courier New', monospace" }}>
      
      {/* ========================================================
          ZONA DE INTERFAZ DEL SISTEMA (No se imprime)
          ======================================================== */}
      <div className="no-print" style={{ padding: '2.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
               <Shield size={24} color={ACCENT} />
               <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                 ENTREGA DE DOTACIONES
               </h1>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.02em' }}>
              Diligencie los elementos de protección personal (EPP) y genere el acta para firma manual.
            </p>
          </div>
          <button onClick={handleImprimir} style={{
            background: ACCENT, color: '#000', border: 'none', padding: '0.75rem 1.5rem',
            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s', borderRadius: '2px'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <Printer size={18} /> IMMODIR ACTA
          </button>
        </div>

        {/* 1. Datos Generales */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 1.5rem 0' }}>1. Información del Trabajador</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>TRABAJADOR</label>
              <select 
                value={selectedTrabajadorId} 
                onChange={e => setSelectedTrabajadorId(e.target.value)}
                style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="">Seleccione un trabajador...</option>
                {trabajadores.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>CÉDULA DE CIUDADANÍA</label>
              <input 
                type="text" 
                value={cedula} 
                onChange={e => setCedula(e.target.value)} 
                placeholder="Ej. 1.193.092.270"
                style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>CARGO / PUESTO DE TRABAJO</label>
              <input 
                type="text" 
                value={cargo} 
                onChange={e => setCargo(e.target.value.toUpperCase())} 
                placeholder="Ej. ASISTENTE CONTABLE"
                style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>MUNICIPIO</label>
              <input 
                type="text" 
                value={municipio} 
                onChange={e => setMunicipio(e.target.value.toUpperCase())} 
                style={{ width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        {/* 2. Productos */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.85rem', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>2. Detalles de Dotación</h2>
            <button onClick={addItem} style={{
              background: 'transparent', color: ACCENT, border: `1px solid ${ACCENT}50`, padding: '0.5rem 1rem',
              fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              <Plus size={14} /> Añadir Fila
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>N°</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Producto</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '100px' }}>Talla</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '120px' }}>Marca</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '80px' }}>Cant.</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '140px' }}>Fecha</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>{index + 1}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <input type="text" value={item.producto} onChange={e => updateItem(item.id, 'producto', e.target.value.toUpperCase())} placeholder="Ej. Botas de seguridad" style={inputRowObj} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input type="text" value={item.talla} onChange={e => updateItem(item.id, 'talla', e.target.value.toUpperCase())} placeholder="Ej. 40" style={inputRowObj} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input type="text" value={item.marca} onChange={e => updateItem(item.id, 'marca', e.target.value.toUpperCase())} placeholder="Marca" style={inputRowObj} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input type="number" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', Number(e.target.value))} style={inputRowObj} min={1} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input type="date" value={item.fechaEntrega} onChange={e => updateItem(item.id, 'fechaEntrega', e.target.value)} style={inputRowObj} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <button onClick={() => removeItem(item.id)} title="Eliminar fila" style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.4rem', opacity: items.length > 1 ? 1 : 0.2 }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          ZONA DE IMPRESIÓN EXCLUSIVA (Solo visible en @media print)
          ======================================================== */}
      <div id="print-area">
        {/* Cabecera Tipo Excel */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '5px', fontFamily: 'Arial, sans-serif' }}>
          <tbody>
            <tr>
              <td style={{ width: '30%', border: '1px solid #000', padding: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                {/* Asumimos que el logo principal puede ser texto estilizado para garantizar compatibilidad, o una imagen */}
                <div style={{ color: MAIN_GREEN, fontWeight: 'bold', fontSize: '18px' }}>La Florida</div>
                <div style={{ color: MAIN_GREEN, fontSize: '14px' }}>Condominio Campestre</div>
              </td>
              <td style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                CONDOMINIO CAMPESTRE LA FLORIDA
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: '1px solid #000', background: '#e8f5e9', color: MAIN_GREEN, padding: '5px', textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>
                KILÓMETRO 5 VÍA RESTREPO VEREDA LA POVATA
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ border: '1px solid #000', background: '#e8f5e9', color: MAIN_GREEN, padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                NIT: 900.858.163-1
              </td>
            </tr>
          </tbody>
        </table>

        {/* Información del Trabajador */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginBottom: '5px', fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 6px', color: MAIN_GREEN, fontWeight: 'bold', width: '35%' }}>Nombre y Apellido del Trabajador:</td>
              <td colSpan={5} style={{ border: '1px solid #000', padding: '4px 6px' }}>{trabajadorActual?.nombre_completo || '__________________________________'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 6px', color: MAIN_GREEN, fontWeight: 'bold' }}>Descripción breve del puesto/s de trabajo:</td>
              <td colSpan={5} style={{ border: '1px solid #000', padding: '4px 6px' }}>{cargo || '__________________________________'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 6px', color: MAIN_GREEN, fontWeight: 'bold', width: '10%' }}>Dpto:</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', width: '15%', textAlign: 'center' }}>META</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', color: MAIN_GREEN, fontWeight: 'bold', width: '10%', textAlign: 'center' }}>Municipio:</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', width: '20%', textAlign: 'center' }}>{municipio || 'VILLAVICENCIO'}</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', color: MAIN_GREEN, fontWeight: 'bold', width: '15%', textAlign: 'center' }}>N° Cédula:</td>
              <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{cedula || '__________________'}</td>
            </tr>
          </tbody>
        </table>

        {/* Subtítulo Descriptivo */}
        <div style={{ fontStyle: 'italic', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#555', marginBottom: '5px', paddingLeft: '5px' }}>
          Elementos de protección personal, necesarios para el trabajador, según el puesto de trabajo.
        </div>

        {/* Tabla Recticular de Productos */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '5%' }}>N°</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '30%' }}>Producto</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '8%' }}>Talla</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '15%' }}>Marca</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '10%' }}>Cantidad</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '15%' }}>Fecha de<br/>entrega</th>
              <th style={{ border: '1px solid #000', background: MAIN_GREEN, color: '#fff', padding: '6px 4px', width: '17%' }}>Firma del<br/>trabajador</th>
            </tr>
          </thead>
          <tbody>
            {printableItems.map((item, index) => (
              <tr key={item.id} style={{ height: '24px' }}>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{item.producto}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{item.talla}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{item.marca}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{item.cantidad > 0 ? item.cantidad : ''}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center', fontSize: '11px' }}>{item.fechaEntrega}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px' }}>{/* Vacio para la firma */}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Marca de agua estilo página (Opcional) */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '8rem', color: 'rgba(0,0,0,0.03)', fontWeight: 'bold', zIndex: -1, pointerEvents: 'none', fontFamily: 'Arial' }}>
          Página 1
        </div>
      </div>

      <style>{`
        /* Ocultar el área de impresión en la pantalla normal */
        #print-area {
          display: none;
        }

        /* Reglas exclusivas para momento de impresión */
        @media print {
          @page {
            size: landscape;
            margin: 0; /* Elimina encabezados y pies de página molestos del navegador (Localhost, Fecha) */
          }
          
          /* Ocultar toda la interfaz de la aplicación, sidebar incluida */
          body * {
            visibility: hidden;
          }
          
          /* Solo mostrar el area de impresión */
          #print-area, #print-area * {
            visibility: visible;
          }
          
          /* Usar position fixed fuerza al navegador a ignorar el tamaño del dashboard oculto 
             y garantiza matemáticamente que siempre se genere 1 sola hoja perfecta */
          #print-area {
            display: block !important;
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            background: white !important;
            color: black !important;
            padding: 15mm 20mm; /* Le devolvemos el margen interno para que no quede pegado al corte del papel */
            box-sizing: border-box;
          }

          /* Desactivamos las animaciones y transformaciones de todo el Dashboard (Layout) 
             porque el 'transform' secuestra el 'position: fixed' causando que se imprima desplazado a la derecha */
          * {
            transform: none !important;
            animation: none !important;
            transition: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Anular explícitamente el margen del sidebar en caso de que su contenedor principal persista */
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}

const inputRowObj = {
  width: '100%', 
  background: 'transparent', 
  border: 'none', 
  borderBottom: '1px solid rgba(255,255,255,0.2)', 
  color: '#fff', 
  padding: '0.4rem', 
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.8rem'
};
