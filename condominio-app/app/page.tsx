'use client';

import { createClient } from '@/lib/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Droplets, 
  Home as HomeIcon, 
  Megaphone, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';

type Rol = 'admin' | 'trabajador' | 'residente';

const ALL_NAV_ITEMS = [
  {
    icon: <Droplets size={20} />,
    label: 'Lecturas',
    description: 'Registro y seguimiento de consumo por unidad',
    route: '/dashboard/lecturas',
    accent: '#4ade80',
    stat: 'ESTE MES',
    roles: ['admin', 'trabajador'],
  },
  {
    icon: <HomeIcon size={20} />,
    label: 'Casas',
    description: 'Directorio y estado de cada unidad residencial',
    route: '/dashboard/casas',
    accent: '#60a5fa',
    stat: 'ACTIVAS',
    roles: ['admin', 'trabajador'],
  },
  {
    icon: <Megaphone size={20} />,
    label: 'Avisos',
    description: 'Noticias y comunicados del condominio',
    route: '/dashboard/avisos',
    accent: '#fbbf24',
    stat: 'ACTIVOS',
    roles: ['admin', 'residente'],
  },
  {
    icon: <Calendar size={20} />,
    label: 'Reservas',
    description: 'Reserva de áreas comunes y espacios compartidos',
    route: '/dashboard/reservas',
    accent: '#4ade80',
    stat: 'DISPONIBLE',
    roles: ['admin', 'residente'],
  },
  {
    icon: <BarChart3 size={20} />,
    label: 'Reportes',
    description: 'Análisis histórico y exportación de datos',
    route: '/dashboard/reportes',
    accent: '#f472b6',
    stat: 'YA REALIZADO',
    roles: ['admin', 'trabajador'],
  },
  {
    icon: <Settings size={20} />,
    label: 'Configuración',
    description: 'Ajustes del sistema y administración',
    route: '/dashboard/configuracion',
    accent: '#fb923c',
    stat: 'PRÓXIMAMENTE',
    roles: ['admin'],
  },
];

export default function Home() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [user, setUser] = useState<{ id: string; nombre?: string; rol?: Rol } | null>(null);

  useEffect(() => {
    setMounted(true);
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('usuarios')
          .select('nombre_completo, rol')
          .eq('id', authUser.id)
          .single();

        setUser({
          id: authUser.id,
          nombre: profile?.nombre_completo || authUser.email,
          rol: (profile?.rol as Rol) || 'residente'
        });
      }
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const navItems = user
    ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(user.rol ?? 'residente'))
    : [];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'Courier New', monospace",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid background (Matching Login) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Corner marks (Matching Login) */}
      {['topleft', 'topright', 'bottomleft', 'bottomright'].map((pos) => (
        <div key={pos} style={{
          position: 'fixed',
          top: pos.startsWith('top') ? '1.5rem' : 'auto',
          bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto',
          left: pos.endsWith('left') ? '1.5rem' : 'auto',
          right: pos.endsWith('right') ? '1.5rem' : 'auto',
          width: '20px', height: '20px',
          borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderLeft: pos.endsWith('left') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          borderRight: pos.endsWith('right') ? '1px solid rgba(255,255,255,0.2)' : 'none',
        }} />
      ))}

      {/* Sesión info (Top Right) */}
      {user && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '2.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease',
          zIndex: 10,
        }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
            {user.nombre}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '0.3rem 0.75rem',
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.6rem', fontFamily: "'Courier New', monospace",
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            → Salir
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        textAlign: 'center', marginBottom: '3.5rem',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-16px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        zIndex: 2,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '2px', padding: '0.3rem 0.75rem',
          marginBottom: '1.5rem', fontSize: '0.65rem',
          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#4ade80', boxShadow: '0 0 6px #4ade80',
            animation: 'pulse 2s infinite',
          }} />
          SISTEMA ACTIVO
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700,
          color: '#ffffff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1,
        }}>
          Condominio Campestre
        </h1>

        <h2 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700,
          color: 'transparent',
          backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text',
          letterSpacing: '-0.02em', margin: '0.2rem 0 1rem', lineHeight: 1,
        }}>
          La Florida
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem',
          letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0,
        }}>
          {user ? `BIENVENIDO, ${user.nombre}` : 'SISTEMA DE GESTIÓN DEL CONDOMINIO'}
        </p>
      </div>

      {/* Login CTA (If no session) */}
      {!user && mounted && (
        <div style={{ textAlign: 'center', zIndex: 2 }}>
           <button
            onClick={() => router.push('/login')}
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))',
              border: '1px solid rgba(96,165,250,0.35)',
              padding: '0.85rem 2.5rem', color: '#ffffff',
              fontSize: '0.75rem', fontFamily: "'Courier New', monospace",
              letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(167,139,250,0.25))';
              e.currentTarget.style.borderColor = 'rgba(96,165,250,0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))';
              e.currentTarget.style.borderColor = 'rgba(96,165,250,0.35)';
            }}
          >
            → Ingresar al sistema
          </button>
        </div>
      )}

      {/* Cards Section */}
      {user && navItems.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1px', width: '100%', maxWidth: '860px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.06)',
          zIndex: 2,
        }}>
          {navItems.map((item, i) => {
            const isHovered = hovered === i;
            return (
              <button
                key={item.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => router.push(item.route)}
                style={{
                  background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(10,10,15,0.95)',
                  border: 'none', padding: '1.75rem',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  position: 'relative',
                }}
              >
                {/* Accent Top Bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: item.accent, opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.2s',
                  boxShadow: isHovered ? `0 0 10px ${item.accent}` : 'none',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    color: isHovered ? item.accent : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.2s',
                  }}>
                    {item.icon}
                  </span>
                  <span style={{
                    fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: item.accent, padding: '0.15rem 0.4rem',
                    border: `1px solid ${item.accent}30`,
                    borderRadius: '1px',
                  }}>
                    {item.stat}
                  </span>
                </div>

                <div>
                  <div style={{
                    color: isHovered ? '#fff' : 'rgba(255,255,255,0.8)',
                    fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em',
                    textTransform: 'uppercase', marginBottom: '0.25rem',
                  }}>
                    {item.label}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                </div>

                <div style={{
                  marginTop: '0.5rem', color: item.accent, fontSize: '0.7rem',
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                  transition: 'all 0.2s',
                }}>
                  → ABRIR
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '3.5rem', color: 'rgba(255,255,255,0.12)',
        fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
        zIndex: 1,
      }}>
        v1.0.0 · ADMINISTRACIÓN DE CONDOMINIOS
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}