'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Droplets, Home, FileBarChart2, Megaphone, CalendarCheck,
  Gauge, Users, Settings, ChevronLeft, LogOut, LucideIcon
} from 'lucide-react';

type Rol = 'admin' | 'trabajador' | 'residente';

type NavItem = {
  icon: LucideIcon;
  label: string;
  route: string;
  roles: Rol[];
  accent: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: Droplets,      label: 'Lecturas',      route: '/dashboard/lecturas',      roles: ['admin', 'trabajador'],  accent: '#60a5fa' },
  { icon: Home,          label: 'Casas',         route: '/dashboard/casas',         roles: ['admin', 'trabajador'],  accent: '#f472b6' },
  { icon: FileBarChart2, label: 'Reportes',      route: '/dashboard/reportes',      roles: ['admin', 'trabajador'],  accent: '#fb923c' },
  { icon: Megaphone,     label: 'Avisos',        route: '/dashboard/avisos',        roles: ['admin', 'residente'],   accent: '#fbbf24' },
  { icon: CalendarCheck, label: 'Reservas',      route: '/dashboard/reservas',      roles: ['admin', 'residente'],   accent: '#4ade80' },
  { icon: Gauge,         label: 'Mis lecturas',  route: '/dashboard/mis-lecturas',  roles: ['residente'],            accent: '#60a5fa' },
  { icon: Users,         label: 'Usuarios',      route: '/dashboard/usuarios',      roles: ['admin'],                accent: '#a78bfa' },
  { icon: Settings,      label: 'Configuración', route: '/dashboard/configuracion', roles: ['admin'],                accent: '#94a3b8' },
];

const ROL_LABEL: Record<Rol, string> = {
  admin:      'Administrador',
  trabajador: 'Trabajador',
  residente:  'Residente',
};

const ROL_COLOR: Record<Rol, string> = {
  admin:      '#a78bfa',
  trabajador: '#60a5fa',
  residente:  '#4ade80',
};

const SIDEBAR_WIDTH     = 220;
const SIDEBAR_COLLAPSED = 64;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user, setUser]           = useState<{ nombre?: string; correo?: string; rol?: Rol } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [isMobile, setIsMobile]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    try {
      const stored = localStorage.getItem('user');
      if (!stored) { router.push('/login'); return; }
      setUser(JSON.parse(stored));
    } catch {
      router.push('/login');
    }
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const rol          = user?.rol ?? 'residente';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(rol));
  const sidebarW     = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  if (!mounted || !user) return null;

  const sidebar = (
    <aside style={{
      width: isMobile ? SIDEBAR_WIDTH : sidebarW,
      minHeight: '100vh',
      background: '#0d0d14',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      position: isMobile ? 'fixed' : 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 50,
      overflow: 'hidden',
      transform: isMobile
        ? mobileOpen ? 'translateX(0)' : 'translateX(-100%)'
        : 'translateX(0)',
      transitionProperty: isMobile ? 'transform' : 'width',
    }}>
      {/* Header sidebar */}
      <div style={{
        padding: collapsed && !isMobile ? '1.25rem 0' : '1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
        minHeight: '60px',
      }}>
        {(!collapsed || isMobile) && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em', lineHeight: 1 }}>
              La Florida
            </div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: '0.2rem' }}>
              Condominio
            </div>
          </div>
        )}
        <button
          onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(!collapsed)}
          style={{
            background: 'transparent', border: 'none',
            color: 'rgba(255, 255, 255, 1)', cursor: 'pointer',
            padding: '0.2rem', display: 'flex', alignItems: 'center',
            transition: 'color 0.2s, transform 0.25s',
            transform: collapsed && !isMobile ? 'rotate(180deg)' : 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => { router.push(item.route); if (isMobile) setMobileOpen(false); }}
              title={collapsed && !isMobile ? item.label : undefined}
              style={{
                width: '100%', border: 'none',
                background: isActive ? `${item.accent}12` : 'transparent',
                borderLeft: isActive ? `2px solid ${item.accent}` : '2px solid transparent',
                padding: collapsed && !isMobile ? '0.75rem 0' : '0.75rem 1.25rem',
                display: 'flex', alignItems: 'center',
                gap: '0.75rem',
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ color: isActive ? item.accent : 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'color 0.15s' }}
              />
              {(!collapsed || isMobile) && (
                <span style={{
                  fontSize: '0.72rem', letterSpacing: '0.06em',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 700 : 400,
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: collapsed && !isMobile ? '1rem 0' : '1rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        alignItems: collapsed && !isMobile ? 'center' : 'flex-start',
      }}>
        {(!collapsed || isMobile) && (
          <div>
            <span style={{
              fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color: ROL_COLOR[rol],
              padding: '0.1rem 0.4rem',
              border: `1px solid ${ROL_COLOR[rol]}40`,
              display: 'inline-block', marginBottom: '0.4rem',
            }}>
              {ROL_LABEL[rol]}
            </span>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 1)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
              {user?.nombre ?? 'Usuario'}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
              {user?.correo}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Cerrar sesión' : undefined}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: collapsed && !isMobile ? '0.45rem' : '0.4rem 0.75rem',
            color: 'rgba(255, 255, 255, 1)',
            fontSize: '0.6rem', fontFamily: "'Courier New', monospace",
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            cursor: 'pointer', transition: 'all 0.2s',
            width: collapsed && !isMobile ? '36px' : '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
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
          <LogOut size={13} />
          {(!collapsed || isMobile) && <span>Salir</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Courier New', monospace",
      position: 'relative',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Glow */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '300px',
        background: 'radial-gradient(ellipse at top, rgba(96,165,250,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Corner marks */}
      {['topright', 'bottomright'].map((pos) => (
        <div key={pos} style={{
          position: 'fixed',
          top: pos.startsWith('top') ? '1.5rem' : 'auto',
          bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto',
          right: '1.5rem',
          width: '18px', height: '18px',
          borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.12)' : 'none',
          borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.12)' : 'none',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          zIndex: 10,
        }} />
      ))}

      {/* Sidebar */}
      {sidebar}

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
          }}
        />
      )}

      {/* Hamburger mobile */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', top: '1rem', left: '1rem',
            zIndex: 60, background: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255, 255, 255, 1)', padding: '0.5rem 0.6rem',
            cursor: 'pointer', fontSize: '1rem',
            fontFamily: "'Courier New', monospace",
          }}
        >
          ☰
        </button>
      )}

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : sidebarW,
        transition: 'margin-left 0.25s ease',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {children}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}