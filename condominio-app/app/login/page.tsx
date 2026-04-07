'use client';

import { useState, useEffect } from 'react';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    if (!correo || !password) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (data.error) {
        setMensaje(data.error);
      } else {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard';
      }
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Courier New', monospace",
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Corner marks */}
      {['topleft', 'topright', 'bottomleft', 'bottomright'].map((pos) => (
        <div
          key={pos}
          style={{
            position: 'fixed',
            top: pos.startsWith('top') ? '1.5rem' : 'auto',
            bottom: pos.startsWith('bottom') ? '1.5rem' : 'auto',
            left: pos.endsWith('left') ? '1.5rem' : 'auto',
            right: pos.endsWith('right') ? '1.5rem' : 'auto',
            width: '20px',
            height: '20px',
            borderTop: pos.startsWith('top') ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderBottom: pos.startsWith('bottom') ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderLeft: pos.endsWith('left') ? '1px solid rgba(255,255,255,0.2)' : 'none',
            borderRight: pos.endsWith('right') ? '1px solid rgba(255,255,255,0.2)' : 'none',
          }}
        />
      ))}

      {/* Login card */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          position: 'relative',
          zIndex: 1,
          padding: '0 1rem', // Add horizontal padding for mobile
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2px',
              padding: '0.3rem 0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 6px #4ade80',
                animation: 'pulse 2s infinite',
              }}
            />
            Acceso restringido
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1,
            }}
          >
            Condominio Campestre
          </h1>

          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'transparent',
              backgroundImage: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              letterSpacing: '-0.02em',
              margin: '0.2rem 0 1rem',
              lineHeight: 1,
            }}
          >
            La Florida
          </h2>

          <p
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: focused === 'correo' ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                transition: 'color 0.2s ease',
              }}
            >
              Correo electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="usuario@condominio.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                onFocus={() => setFocused('correo')}
                onBlur={() => setFocused(null)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${focused === 'correo' ? '#60a5fa40' : 'rgba(255,255,255,0.08)'}`,
                  padding: '0.7rem 0.9rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontFamily: "'Courier New', monospace",
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                  boxShadow: focused === 'correo' ? '0 0 0 3px rgba(96,165,250,0.06)' : 'none',
                }}
              />
              {focused === 'correo' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                    animation: 'slideIn 0.2s ease',
                  }}
                />
              )}
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: focused === 'password' ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                transition: 'color 0.2s ease',
              }}
            >
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${focused === 'password' ? '#60a5fa40' : 'rgba(255,255,255,0.08)'}`,
                  padding: '0.7rem 0.9rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontFamily: "'Courier New', monospace",
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                  boxShadow: focused === 'password' ? '0 0 0 3px rgba(96,165,250,0.06)' : 'none',
                }}
              />
              {focused === 'password' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                    animation: 'slideIn 0.2s ease',
                  }}
                />
              )}
            </div>
          </div>

          {/* Error message */}
          {mensaje && (
            <div
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                padding: '0.6rem 0.9rem',
                fontSize: '0.72rem',
                color: '#f87171',
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ opacity: 0.7 }}>⚠</span>
              {mensaje}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              background: loading
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #60a5fa20, #a78bfa20)',
              border: `1px solid ${loading ? 'rgba(255,255,255,0.08)' : '#60a5fa40'}`,
              padding: '0.85rem',
              color: loading ? 'rgba(255,255,255,0.3)' : '#ffffff',
              fontSize: '0.75rem',
              fontFamily: "'Courier New', monospace",
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background =
                  'linear-gradient(135deg, #60a5fa30, #a78bfa30)';
                (e.target as HTMLButtonElement).style.borderColor = '#60a5fa80';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.background =
                  'linear-gradient(135deg, #60a5fa20, #a78bfa20)';
                (e.target as HTMLButtonElement).style.borderColor = '#60a5fa40';
              }
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                Verificando...
              </>
            ) : (
              <>→ Ingresar al sistema</>
            )}
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.12)',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '1.5rem',
          }}
        >
          Acceso autorizado únicamente · v1.0.0
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideIn {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}