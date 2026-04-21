'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client';
import { 
  Save, 
  RefreshCw, 
  Building2, 
  Droplets, 
  CircleDollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Config {
  id?: number;
  clave: string;
  valor: string;
  descripcion: string;
}

const DEFAULT_CONFIGS: Config[] = [
  { clave: 'tarifa_m3', valor: '1605', descripcion: 'Precio por m3 excedente' },
  { clave: 'limite_basico', valor: '60', descripcion: 'm3 incluidos en la administración' },
  { clave: 'nombre_condominio', valor: 'Condominio La Florida', descripcion: 'Nombre oficial para reportes' }
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Config[]>(DEFAULT_CONFIGS);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', text: string } | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error loading config:', error);
    } else if (data && data.length > 0) {
      setConfigs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleChange = (clave: string, valor: string) => {
    setConfigs(prev => {
      const exists = prev.some(c => c.clave === clave);
      if (exists) {
        return prev.map(c => c.clave === clave ? { ...c, valor } : c);
      }
      return [...prev, { clave, valor, descripcion: '' }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMensaje(null);

    const promises = configs.map(config => 
      supabase
        .from('configuracion')
        .upsert({ 
          clave: config.clave, 
          valor: config.valor, 
          descripcion: config.descripcion,
          actualizado_el: new Date().toISOString() 
        }, { onConflict: 'clave' })
    );

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);

    if (hasError) {
      console.error('Error saving:', results.map(r => r.error));
      setMensaje({ tipo: 'error', text: 'Error al guardar algunos cambios.' });
    } else {
      setMensaje({ tipo: 'success', text: 'Configuración guardada correctamente.' });
      setTimeout(() => setMensaje(null), 3000);
    }
    setSaving(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f', 
      fontFamily: "'Courier New', monospace", 
      position: 'relative',
      paddingBottom: '4rem'
    }}>
      {/* Background elements */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      
      {/* Corner marks */}
      {['topleft', 'topright', 'bottomleft', 'bottomright'].map((pos) => (
        <div key={pos} style={{ position: 'fixed', top: pos.startsWith('top') ? '1.5rem' : 'auto', bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto', left: pos.endsWith('left') ? '1.5rem' : 'auto', right: pos.endsWith('right') ? '1.5rem' : 'auto', width: '20px', height: '20px', borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderLeft: pos.endsWith('left') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderRight: pos.endsWith('right') ? '1px solid rgba(255,255,255,0.2)' : 'none', zIndex: 10 }} />
      ))}

      <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(8px)' }}>
        <button 
          onClick={() => router.push('/dashboard')} 
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Courier New', monospace", display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} 
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          ← Regresar
        </button>
        <span style={{ fontSize: '0.65rem', color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Consola de Configuración</span>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '2.2rem', letterSpacing: '-0.02em' }}>Configuración</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Parámetros globales del sistema y lógica de facturación.</p>
        </header>

        {mensaje && (
          <div style={{ 
            background: mensaje.tipo === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${mensaje.tipo === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            padding: '1rem', borderRadius: '4px', marginBottom: '2rem',
            color: mensaje.tipo === 'success' ? '#4ade80' : '#f87171',
            display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem'
          }}>
            {mensaje.tipo === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {mensaje.text}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.2)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <span>Sincronizando con base de datos...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '2rem' }}>
            
            {/* Sección: Agua */}
            <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#60a5fa' }}>
                <Droplets size={20} />
                <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cobro de Agua</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Tarifa Excedente ($/m³)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>$</span>
                    <input 
                      type="number"
                      value={configs.find(c => c.clave === 'tarifa_m3')?.valor || ''}
                      onChange={(e) => handleChange('tarifa_m3', e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0.75rem 0.75rem 1.75rem', color: '#fff', fontFamily: "'Courier New', monospace", fontSize: '0.9rem', borderRadius: '2px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Límite Básico (m³)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number"
                      value={configs.find(c => c.clave === 'limite_basico')?.valor || ''}
                      onChange={(e) => handleChange('limite_basico', e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', color: '#fff', fontFamily: "'Courier New', monospace", fontSize: '0.9rem', borderRadius: '2px' }}
                    />
                    <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem' }}>m3</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección: Condominio */}
            <section style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#f472b6' }}>
                <Building2 size={20} />
                <h3 style={{ margin: 0, fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Identidad del Condominio</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Nombre Oficial para Reportes</label>
                <input 
                  type="text"
                  value={configs.find(c => c.clave === 'nombre_condominio')?.valor || ''}
                  onChange={(e) => handleChange('nombre_condominio', e.target.value)}
                  placeholder="Ej: Condominio Campestre La Florida"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', color: '#fff', fontFamily: "'Courier New', monospace", fontSize: '0.9rem', borderRadius: '2px' }}
                />
              </div>
            </section>

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.2))',
                  border: '1px solid #60a5fa40',
                  padding: '1rem 2.5rem',
                  color: '#fff',
                  fontFamily: "'Courier New', monospace",
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease',
                  borderRadius: '2px'
                }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.borderColor = '#60a5fa80')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.borderColor = '#60a5fa40')}
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Aplicar Cambios
                  </>
                )}
              </button>
            </div>

          </div>
        )}
      </main>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}