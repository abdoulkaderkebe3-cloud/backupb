import { getPool } from './db.js';
import { handleCors } from './cors.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const pool = getPool();

    // Robust body parsing — Vercel sometimes passes body as string
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Corps de requête invalide' });
    }

    const { professorId, scores, comment, level, className, studentHash } = body;

    if (!professorId || !scores) {
      return res.status(400).json({ error: 'professorId and scores are required' });
    }

    // Validate scores (1-5)
    for (const [key, val] of Object.entries(scores)) {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 5) {
        return res.status(400).json({ error: `Score invalide pour ${key}: doit être entre 1 et 5` });
      }
    }

    // Sanitize comment (XSS prevention)
    const safeComment = comment
      ? comment.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      : '';

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await pool.query(
      `INSERT INTO evaluations (id, "professorId", "studentHash", timestamp, level, "className", scores, comment) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, professorId, studentHash || 'anonymous', timestamp, level || '', className || '', JSON.stringify(scores), safeComment]
    );

    res.status(200).json({ success: true, message: 'Evaluation enregistrée avec succès.' });
  } catch (err) {
    console.error('evaluate error:', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

