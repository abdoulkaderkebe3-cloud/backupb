import { getPool } from '../db.js';
import { handleCors } from '../cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM professors');

    const result = {};
    const defaultFilieres = ['3EA', 'ASSRI', 'MIAGE', 'SEA', 'SEG', 'SJAP'];
    result['LICENCE 1'] = [...defaultFilieres];
    result['LICENCE 2'] = [...defaultFilieres];
    result['LICENCE 3'] = [...defaultFilieres];

    for (const p of rows) {
      const levels = (p.level || '').split(',').map(l => l.trim()).filter(Boolean);
      const classes = (p.className || '').split(',').map(c => c.trim()).filter(Boolean);
      levels.forEach(lvl => {
        if (!result[lvl]) result[lvl] = [];
        classes.forEach(cls => {
          if (!result[lvl].includes(cls)) result[lvl].push(cls);
        });
      });
    }

    for (const lvl of Object.keys(result)) {
      result[lvl].sort();
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('levels error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
