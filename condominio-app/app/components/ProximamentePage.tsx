'use client';

import { useRouter } from 'next/navigation';

const PAGES: Record<string, { label: string; icon: string; accent: string; descripcion: string }> = {
  reportes:      { label: 'Reportes',      icon: '◎', accent: '#f472b6', descripcion: 'Análisis histórico y exportación de datos del condominio.' },
  avisos:        { label: 'Avisos',         icon: '📢', accent: '#fbbf24', descripcion: 'Comunicados y noticias para los residentes.' },
  reservas:      { label: 'Reservas',       icon: '🏊', accent: '#4ade80', descripcion: 'Gestión de áreas comunes y espacios compartidos.' },
  usuarios:      { label: 'Usuarios',       icon: '👥', accent: '#a78bfa', descripcion: 'Administración de cuentas y roles del sistema.' },
  configuracion: { label: 'Configuración',  icon: '⚙',  accent: '#94a3b8', descripcion: 'Ajustes generales del sistema.' },
};

export default function ProximamentePage({ slug }: { slug: string }) {
  const router = useRouter();
  const page = PAGES[slug] ?? { label: slug, icon: '◈', accent: '#60a5fa', descripcion: 'Módulo en construcción.' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Courier New', monospace", padding: '2rem',
      position: 'relative',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: '400px',
      }}>
        {/* Icon */}
        <div style={{
          fontSize: '3rem', marginBottom: '1.5rem',
          color: page.accent, opacity: 0.5,
        }}>
          {page.icon}
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: `${page.accent}12`,
          border: `1px solid ${page.accent}30`,
          padding: '0.25rem 0.75rem', marginBottom: '1.25rem',
          fontSize: '0.6rem', letterSpacing: '0.18em',
          textTransform: 'uppercase' as const, color: page.accent,
        }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: page.accent, animation: 'pulse 2s infinite',
            display: 'inline-block',
          }} />
          En desarrollo
        </div>

        <h1 style={{
          fontSize: '1.6rem', fontWeight: 700, color: '#ffffff',
          letterSpacing: '-0.02em', margin: '0 0 0.75rem',
        }}>
          {page.label}
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem',
          lineHeight: 1.6, letterSpacing: '0.03em', margin: '0 0 2rem',
        }}>
          {page.descripcion}
          <br />Este módulo estará disponible próximamente.
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.6rem 1.5rem', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.65rem', fontFamily: "'Courier New', monospace",
            letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          ← Volver al dashboard
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}