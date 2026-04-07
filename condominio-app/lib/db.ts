import mysql from 'mysql2/promise';

// Singleton para evitar múltiples pools en desarrollo (hot reload de Next.js)
const globalForDb = global as unknown as { pool: mysql.Pool };

export const pool =
  globalForDb.pool ??
  mysql.createPool({
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'condominio_florida',
    waitForConnections: true,
    connectionLimit:    3,
    queueLimit:         0,
    idleTimeout:        60000,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;