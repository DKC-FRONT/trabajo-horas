'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { createClient } = await import('@/lib/client');
      const supabase = createClient();

      // 1. Registro en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.nombre,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        setMessage({ type: 'success', text: '¡Registro exitoso! Redirigiendo...' });
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al registrarse' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Background Decor */}
      <div style={glowStyle} />
      
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={iconContainerStyle}>
            <UserPlus size={28} color="#60a5fa" />
          </div>
          <h1 style={titleStyle}>Crear Cuenta</h1>
          <p style={subtitleStyle}>Únete al sistema de La Florida</p>
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: message.type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
            border: `1px solid ${message.type === 'error' ? '#f87171' : '#4ade80'}`,
            color: message.type === 'error' ? '#f87171' : '#4ade80',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={inputGroupStyle}>
            <User size={18} style={inputIconStyle} />
            <input
              type="text"
              placeholder="Nombre Completo"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <Mail size={18} style={inputIconStyle} />
            <input
              type="email"
              placeholder="Correo Electrónico"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <Lock size={18} style={inputIconStyle} />
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#60a5fa')}
          >
            {loading ? 'Procesando...' : 'Registrarse'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={footerStyle}>
          ¿Ya tienes cuenta?{' '}
          <span
            onClick={() => router.push('/login')}
            style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
          >
            Inicia sesión aquí
          </span>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', opacity: 0.5 }}>
          <ShieldCheck size={16} color="#fff" />
          <span style={{ fontSize: '0.65rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Seguridad Supabase Activa</span>
        </div>
      </div>
    </div>
  );
}

// Estilos
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0a0a0f',
  fontFamily: "'Courier New', monospace",
  position: 'relative',
  overflow: 'hidden',
  padding: '2rem',
};

const glowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '600px',
  height: '600px',
  background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)',
  zIndex: 0,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '3rem 2.5rem',
  position: 'relative',
  zIndex: 1,
};

const iconContainerStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  background: 'rgba(96, 165, 250, 0.1)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1.5rem',
  border: '1px solid rgba(96, 165, 250, 0.2)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  color: '#fff',
  fontWeight: 700,
  margin: '0 0 0.5rem',
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.4)',
};

const inputGroupStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '1rem',
  color: 'rgba(255,255,255,0.3)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '0.85rem 1rem 0.85rem 3rem',
  color: '#fff',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'all 0.2s',
};

const buttonStyle: React.CSSProperties = {
  background: '#60a5fa',
  color: '#fff',
  border: 'none',
  padding: '1rem',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  transition: 'all 0.2s',
  marginTop: '0.5rem',
};

const footerStyle: React.CSSProperties = {
  marginTop: '2rem',
  textAlign: 'center',
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.4)',
};
