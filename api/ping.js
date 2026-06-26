import { getPool } from './db.js';
import { handleCors } from './cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const pool = getPool();
    // Simple query to keep Supabase DB active
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', message: 'Database is awake' });
  } catch (err) {
    console.error('Ping database error:', err);
    res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
}
