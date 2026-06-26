import { getPool } from '../db.js';
import { handleCors } from '../cors.js';
import jwt from 'jsonwebtoken';

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (!verifyToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pool = getPool();
    const { rows: profs } = await pool.query('SELECT * FROM professors');
    const { rows: evals } = await pool.query('SELECT * FROM evaluations');

    // Check if looking for a specific professor by ID
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // /api/results/:id
    const profId = pathParts.length >= 3 ? pathParts[pathParts.length - 1] : null;

    if (profId && profId !== 'results') {
      // Single professor detail
      const prof = profs.find(p => p.id === profId);
      if (!prof) return res.status(404).json({ error: 'Professor not found' });

      const allProfEntries = profs.filter(p => p.name.trim().toLowerCase() === prof.name.trim().toLowerCase());
      const allIds = allProfEntries.map(p => p.id);
      const profEvals = evals.filter(e => allIds.includes(e.professorId));

      const scoresSum = {};
      profEvals.forEach(e => {
        const scores = typeof e.scores === 'string' ? JSON.parse(e.scores) : e.scores;
        Object.entries(scores).forEach(([key, val]) => {
          if (!scoresSum[key]) scoresSum[key] = 0;
          scoresSum[key] += Number(val);
        });
      });

      const averageScores = {};
      if (profEvals.length > 0) {
        Object.keys(scoresSum).forEach(key => {
          averageScores[key] = Number((scoresSum[key] / profEvals.length).toFixed(2));
        });
      }

      const courseById = new Map(allProfEntries.map(p => [p.id, p.course]));
      const comments = profEvals
        .filter(e => e.comment && e.comment.trim().length > 0)
        .map(e => ({
          date: e.timestamp,
          comment: e.comment,
          level: e.level,
          className: e.className,
          course: courseById.get(e.professorId) || null,
        }));

      return res.status(200).json({
        professor: {
          ...prof,
          courses: [...new Set(allProfEntries.map(p => p.course))],
          classNames: [...new Set(allProfEntries.map(p => p.className))],
        },
        evaluationsCount: profEvals.length,
        averageScores,
        comments,
      });
    }

    // Global stats
    const professorMap = new Map();
    for (const prof of profs) {
      const key = prof.name.trim().toLowerCase();
      if (!professorMap.has(key)) {
        professorMap.set(key, {
          ids: [], name: prof.name, courses: [], levels: [], classNames: [],
          email: prof.email, contact: prof.contact,
        });
      }
      const entry = professorMap.get(key);
      entry.ids.push(prof.id);
      if (!entry.courses.includes(prof.course)) entry.courses.push(prof.course);
      if (!entry.levels.includes(prof.level)) entry.levels.push(prof.level);
      if (!entry.classNames.includes(prof.className)) entry.classNames.push(prof.className);
    }

    const stats = Array.from(professorMap.values()).map(group => {
      const profEvals = evals.filter(e => group.ids.includes(e.professorId));
      let totalScore = 0, count = 0;
      profEvals.forEach(e => {
        const scores = typeof e.scores === 'string' ? JSON.parse(e.scores) : e.scores;
        Object.values(scores).forEach(score => {
          totalScore += Number(score);
          count++;
        });
      });

      return {
        id: group.ids[0], ids: group.ids, name: group.name, courses: group.courses,
        level: group.levels.join(', '), className: group.classNames.join(', '),
        evaluationsCount: profEvals.length,
        averageScore: count > 0 ? Number((totalScore / count).toFixed(2)) : 0,
        email: group.email, contact: group.contact,
      };
    });

    res.status(200).json({
      totalProfessors: professorMap.size,
      totalEvaluations: evals.length,
      professorsStats: stats,
    });
  } catch (err) {
    console.error('results error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
