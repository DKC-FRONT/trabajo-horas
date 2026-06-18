'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#fdf5e6',
      fontFamily: 'inherit'
    }}>
      <h1 style={{ fontSize: '4.5rem', color: '#f87171' }}>404</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>PAGINA NO ENCONTRADA</p>
      <Link 
        href="/"
        style={{
          color: '#60a5fa',
          textDecoration: 'none',
          border: '1px solid #60a5fa',
          padding: '0.5rem 1rem'
        }}
      >
        REGRESAR AL INICIO
      </Link>
    </div>
  );
}
