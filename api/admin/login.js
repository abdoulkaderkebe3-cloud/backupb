import { handleCors } from '../cors.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'POST') {
    // Robust body parsing
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'Corps de requête invalide' });
    }

    const { password } = body;
    if (password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      return res.status(200).json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

