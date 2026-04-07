'use client';

import { useRouter } from 'next/navigation';

export default function ConfiguracionPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Courier New', monospace", position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      {['topleft', 'topright', 'bottomleft', 'bottomright'].map((pos) => (
        <div key={pos} style={{ position: 'fixed', top: pos.startsWith('top') ? '1.5rem' : 'auto', bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto', left: pos.endsWith('left') ? '1.5rem' : 'auto', right: pos.endsWith('right') ? '1.5rem' : 'auto', width: '20px', height: '20px', borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderLeft: pos.endsWith('left') ? '1px solid rgba(255,255,255,0.2)' : 'none', borderRight: pos.endsWith('right') ? '1px solid rgba(255,255,255,0.2)' : 'none', zIndex: 10 }} />
      ))}

      <nav style={{ position: 'relative', zIndex: 5, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 1)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'Courier New', monospace", padding: 0 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
          ← Dashboard
        </button>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.08em' }}>Configuración</span>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ color: '#fff', margin: '0 0 0.5rem', fontSize: '1.8rem' }}>Configuración</h1>
        <p style={{ color: 'rgba(203,213,225,0.8)', marginBottom: '1.4rem' }}>Ajustes generales del sistema y parámetros del condominio.</p>

        <div style={{ display: 'grid', gap: '1rem', color: '#e2e8f0' }}>
          <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>Zona horaria</p>
            <strong>America/Bogota</strong>
          </div>

          <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>Idioma</p>
            <strong>Español</strong>
          </div>

          <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>Notificaciones</p>
            <p style={{ margin: 0, color: '#cbd5e1' }}>Desactivado en esta versión demo.</p>
          </div>
        </div>
      </main>
    </div>
  );
}