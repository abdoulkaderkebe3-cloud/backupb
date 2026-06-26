import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

@Controller('api/results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  async getGlobalStats() {
    const profs = await this.dbService.getProfessors();
    const evals = await this.dbService.getEvaluations();

    // Group professors by name to avoid duplicates
    const professorMap = new Map<string, {
      ids: string[];
      name: string;
      courses: string[];
      levels: string[];
      classNames: string[];
      email?: string;
      contact?: string;
    }>();

    for (const prof of profs) {
      const key = prof.name.trim().toLowerCase();
      if (!professorMap.has(key)) {
        professorMap.set(key, {
          ids: [],
          name: prof.name,
          courses: [],
          levels: [],
          classNames: [],
          email: prof.email,
          contact: prof.contact,
        });
      }
      const entry = professorMap.get(key)!;
      entry.ids.push(prof.id);
      if (!entry.courses.includes(prof.course)) entry.courses.push(prof.course);
      if (!entry.levels.includes(prof.level)) entry.levels.push(prof.level);
      if (!entry.classNames.includes(prof.className)) entry.classNames.push(prof.className);
    }

    const stats = Array.from(professorMap.values()).map(group => {
      // Get all evaluations for all IDs of this professor
      const profEvals = evals.filter(e => group.ids.includes(e.professorId));
      let totalScore = 0;
      let count = 0;

      profEvals.forEach(e => {
        Object.values(e.scores).forEach(score => {
          totalScore += Number(score);
          count++;
        });
      });

      return {
        id: group.ids[0], // Use first ID as canonical ID for detail lookup
        ids: group.ids,
        name: group.name,
        courses: group.courses,
        level: group.levels.join(', '),
        className: group.classNames.join(', '),
        evaluationsCount: profEvals.length,
        averageScore: count > 0 ? Number((totalScore / count).toFixed(2)) : 0,
        email: group.email,
        contact: group.contact,
      };
    });

    return {
      totalProfessors: professorMap.size, // Unique professor count
      totalEvaluations: evals.length,
      professorsStats: stats,
    };
  }

  @Get('by-name/:name')
  async getProfessorStatsByName(@Param('name') name: string) {
    const profs = await this.dbService.getProfessors();
    const evals = await this.dbService.getEvaluations();

    // Find all entries for this professor name
    const profEntries = profs.filter(p => p.name.trim().toLowerCase() === decodeURIComponent(name).trim().toLowerCase());
    if (profEntries.length === 0) return { error: 'Professor not found' };

    const allIds = profEntries.map(p => p.id);
    const profEvals = evals.filter(e => allIds.includes(e.professorId));

    const scoresSum: Record<string, number> = {};
    profEvals.forEach(e => {
      Object.entries(e.scores).forEach(([key, val]) => {
        if (!scoresSum[key]) scoresSum[key] = 0;
        scoresSum[key] += Number(val);
      });
    });

    const averageScores: Record<string, number> = {};
    if (profEvals.length > 0) {
      Object.keys(scoresSum).forEach(key => {
        averageScores[key] = Number((scoresSum[key] / profEvals.length).toFixed(2));
      });
    }

    const courseById = new Map(profEntries.map(p => [p.id, p.course]));
    const comments = profEvals
      .filter(e => e.comment && e.comment.trim().length > 0)
      .map(e => ({
        date: e.timestamp,
        comment: e.comment,
        level: e.level,
        className: e.className,
        course: courseById.get(e.professorId) || null,
      }));

    // Aggregate unique courses and classes
    const courses = [...new Set(profEntries.map(p => p.course))];
    const classNames = [...new Set(profEntries.map(p => p.className))];
    const levels = [...new Set(profEntries.map(p => p.level))];

    return {
      professor: {
        name: profEntries[0].name,
        courses,
        classNames,
        levels,
        email: profEntries[0].email,
        contact: profEntries[0].contact,
      },
      evaluationsCount: profEvals.length,
      averageScores,
      comments,
    };
  }

  // Keep individual ID lookup for backward compat
  @Get(':id')
  async getProfessorStats(@Param('id') id: string) {
    const profs = await this.dbService.getProfessors();
    const prof = profs.find(p => p.id === id);
    if (!prof) return { error: 'Professor not found' };

    const evals = await this.dbService.getEvaluations();
    // Find ALL entries for this professor by name to aggregate
    const allProfEntries = profs.filter(p => p.name.trim().toLowerCase() === prof.name.trim().toLowerCase());
    const allIds = allProfEntries.map(p => p.id);
    const profEvals = evals.filter(e => allIds.includes(e.professorId));

    const scoresSum: Record<string, number> = {};
    profEvals.forEach(e => {
      Object.entries(e.scores).forEach(([key, val]) => {
        if (!scoresSum[key]) scoresSum[key] = 0;
        scoresSum[key] += Number(val);
      });
    });

    const averageScores: Record<string, number> = {};
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

    return {
      professor: {
        ...prof,
        courses: [...new Set(allProfEntries.map(p => p.course))],
        classNames: [...new Set(allProfEntries.map(p => p.className))],
      },
      evaluationsCount: profEvals.length,
      averageScores,
      comments,
    };
  }
}
