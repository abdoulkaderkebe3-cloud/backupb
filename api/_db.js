import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}
