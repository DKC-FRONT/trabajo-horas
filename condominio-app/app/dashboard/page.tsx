'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Droplets, Home, FileBarChart2, Megaphone, CalendarCheck,
  Gauge, Users, Settings, Activity, LucideIcon
} from 'lucide-react';

type Rol = 'admin' | 'trabajador' | 'residente';

type UserSession = {
  nombre?: string;
  correo?: string;
  rol?: Rol;
  casa_id?: number | null;
};

type NavModule = {
  icon: LucideIcon;
  label: string;
  desc: string;
  route: string;
  accent: string;
  roles: Rol[];
};

const NAV_MODULES: NavModule[] = [
  { icon: Droplets,      label: 'Lecturas de Agua', desc: 'Registro y seguimiento de consumo',      route: '/dashboard/lecturas',      accent: '#60a5fa', roles: ['admin','trabajador'] as Rol[] },
  { icon: Home,          label: 'Casas',            desc: 'Directorio de unidades residenciales',  route: '/dashboard/casas',         accent: '#f472b6', roles: ['admin','trabajador'] as Rol[] },
  { icon: FileBarChart2, label: 'Reportes',         desc: 'Análisis histórico y exportación',   route: '/dashboard/reportes',      accent: '#fb923c', roles: ['admin','trabajador'] as Rol[] },
  { icon: Megaphone,     label: 'Avisos',           desc: 'Cartelera y notificaciones',             route: '/dashboard/avisos',        accent: '#fbbf24', roles: ['admin','residente'] as Rol[] },
  { icon: CalendarCheck, label: 'Reservas',         desc: 'Gestión de áreas comunes',            route: '/dashboard/reservas',      accent: '#4ade80', roles: ['admin','residente'] as Rol[] },
  { icon: Gauge,         label: 'Mis Lecturas',     desc: 'Historial de consumo personal',          route: '/dashboard/mis-lecturas',  accent: '#60a5fa', roles: ['residente'] as Rol[] },
  { icon: Users,         label: 'Usuarios',         desc: 'Administración de cuentas y accesos',  route: '/dashboard/usuarios',      accent: '#a78bfa', roles: ['admin'] as Rol[] },
  { icon: Settings,      label: 'Configuración',    desc: 'Ajustes y parámetros del sistema',     route: '/dashboard/configuracion', accent: '#94a3b8', roles: ['admin'] as Rol[] },
];

const ROL_META: Record<string, { color: string; label: string }> = {
  admin:      { color: '#a78bfa', label: 'Administrador' },
  trabajador: { color: '#60a5fa', label: 'Trabajador' },
  residente:  { color: '#4ade80', label: 'Residente' },
};

export default function DashboardHomePage() {
  const router   = useRouter();
  const [user, setUser]         = useState<UserSession | null>(null);
  const [hovered, setHovered]   = useState<string | null>(null);
  const [visible, setVisible]   = useState(false);
  const [stats, setStats]       = useState({ casas: 0, lecturas: 0, avisos: 0, reservas: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setTimeout(() => setVisible(true), 50);
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [rc, rl, ra, rr] = await Promise.all([
        fetch('/api/casas'),
        fetch('/api/lecturas'),
        fetch('/api/avisos'),
        fetch('/api/reservas'),
      ]);
      const [casas, lecturas, avisos, reservas] = await Promise.all([rc.json(), rl.json(), ra.json(), rr.json()]);
      setStats({
        casas:    Array.isArray(casas) ? casas.length : 0,
        lecturas: Array.isArray(lecturas) ? lecturas.length : 0,
        avisos:   Array.isArray(avisos) ? avisos.length : 0,
        reservas: Array.isArray(reservas) ? reservas.filter((r: any) => r.estado === 'pendiente').length : 0,
      });
    } catch {}
    finally { setStatsLoaded(true); }
  };

  const rol = user?.rol ?? 'residente';
  const rolMeta = ROL_META[rol] ?? ROL_META.residente;
  const visibleModules = NAV_MODULES.filter(m => m.roles.includes(rol as Rol));
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const statItems = [
    { label: 'Casas activas',     value: statsLoaded ? stats.casas    : '—', accent: '#f472b6' },
    { label: 'Total lecturas',    value: statsLoaded ? stats.lecturas  : '—', accent: '#60a5fa' },
    { label: 'Avisos publicados', value: statsLoaded ? stats.avisos    : '—', accent: '#fbbf24' },
    { label: 'Reservas pendientes', value: statsLoaded ? stats.reservas : '—', accent: '#4ade80' },
  ].filter((_, i) => rol === 'admin' || (rol === 'trabajador' && i < 2) || (rol === 'residente' && [2,3].includes(i)));

  return (
    <div style={{
      padding: '2.5rem',
      fontFamily: "'Courier New', monospace",
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>

      {/* ── Bienvenida ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.5rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: '0 0 0.35rem' }}>
          {saludo}
        </p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          {user?.nombre ? `Hola, ${user.nombre.split(' ')[0]}` : 'Panel General'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.6rem', padding: '0.2rem 0.65rem',
            border: `1px solid ${rolMeta.color}35`, color: rolMeta.color,
            background: `${rolMeta.color}10`, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {rolMeta.label}
          </span>
          {user?.correo && (
            <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.04em' }}>
              {user.correo}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <Activity size={11} style={{ color: 'rgba(255, 255, 255, 1)' }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 1)', letterSpacing: '0.06em' }}>Sistema activo</span>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {statItems.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${statItems.length}, 1fr)`,
          gap: '1px', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.06)', marginBottom: '2.5rem',
        }}>
          {statItems.map((stat, idx) => (
            <div key={stat.label} style={{
              background: '#0a0a0f', padding: '1.25rem 1.5rem',
              display: 'flex', flexDirection: 'column', gap: '0.3rem',
              animation: `fadeSlideIn 0.35s ease ${idx * 0.07}s both`,
            }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: stat.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', marginTop: '0.1rem' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Módulos ── */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 1)', margin: 0 }}>
          Módulos disponibles
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {visibleModules.map((mod, i) => {
          const isHov = hovered === mod.route;
          const Icon = mod.icon;
          return (
            <button key={mod.route}
              onClick={() => router.push(mod.route)}
              onMouseEnter={() => setHovered(mod.route)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? `${mod.accent}08` : '#0a0a0f',
                border: 'none', padding: '1.75rem', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.2s ease',
                position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                animation: `fadeSlideIn 0.4s ease ${i * 0.06}s both`,
                fontFamily: "'Courier New', monospace",
              }}
            >
              {/* Accent top bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(to right, ${mod.accent}, transparent)`,
                opacity: isHov ? 1 : 0, transition: 'opacity 0.2s',
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: isHov ? `${mod.accent}18` : `${mod.accent}0c`,
                  border: `1px solid ${isHov ? mod.accent + '45' : mod.accent + '20'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Icon size={17} strokeWidth={1.75} style={{ color: isHov ? mod.accent : `${mod.accent}bb`, transition: 'color 0.2s' }} />
                </div>
                <span style={{
                  fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: isHov ? mod.accent : 'rgba(255,255,255,0.2)',
                  padding: '0.15rem 0.45rem', border: `1px solid ${isHov ? mod.accent + '50' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}>
                  Activo
                </span>
              </div>

              <div>
                <div style={{
                  color: isHov ? '#ffffff' : 'rgba(255,255,255,0.8)',
                  fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', marginBottom: '0.35rem', transition: 'color 0.2s',
                }}>
                  {mod.label}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 1)', fontSize: '0.7rem', lineHeight: 1.5, letterSpacing: '0.02em' }}>
                  {mod.desc}
                </div>
              </div>

              <div style={{
                color: mod.accent, fontSize: '0.72rem',
                opacity: isHov ? 1 : 0,
                transform: isHov ? 'translateX(5px)' : 'translateX(0)',
                transition: 'opacity 0.2s, transform 0.2s',
                letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <span>Abrir</span>
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}