import { getPool } from '../db.js';
import { handleCors } from '../cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const pool = getPool();
    const { level, className } = req.query;

    let query = 'SELECT * FROM professors';
    const params = [];

    if (level && className) {
      query += " WHERE level ILIKE $1 AND \"className\" ILIKE $2";
      params.push(`%${level}%`, `%${className}%`);
    } else if (level) {
      query += ' WHERE level ILIKE $1';
      params.push(`%${level}%`);
    } else if (className) {
      query += ' WHERE "className" ILIKE $1';
      params.push(`%${className}%`);
    }

    const { rows } = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error('professors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
