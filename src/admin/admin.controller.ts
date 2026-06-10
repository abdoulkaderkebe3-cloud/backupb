import { Controller, Post, Body, Get, Res, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';
import { AdminLoginDto } from '../evaluate/evaluate.dto';
import type { Response } from 'express';
import * as xlsx from 'xlsx';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  async login(@Body() body: AdminLoginDto) {
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (body.password === adminPassword) {
      // Generate a real signed JWT token
      const token = await this.jwtService.signAsync({
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      });
      return { success: true, token };
    }

    throw new HttpException('Mot de passe incorrect', HttpStatus.UNAUTHORIZED);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  async exportResults(@Res() res: Response) {
    const profs = await this.dbService.getProfessors();
    const evals = await this.dbService.getEvaluations();

    const CRITERIA_LABELS: Record<string, string> = {
      q1_1: 'Maîtrise - Q1', q1_2: 'Maîtrise - Q2',
      q2_1: 'Clarté - Q1', q2_2: 'Clarté - Q2',
      q3_1: 'Organisation - Q1', q3_2: 'Organisation - Q2',
      q4_1: 'Pédagogie - Q1', q4_2: 'Pédagogie - Q2',
      q5_1: 'Disponibilité - Q1', q5_2: 'Disponibilité - Q2',
      q6_1: 'Évaluation - Q1', q6_2: 'Évaluation - Q2',
      q7_1: 'Respect - Q1', q7_2: 'Respect - Q2',
      q8_1: 'Ponctualité - Q1', q8_2: 'Ponctualité - Q2',
    };

    // Build rows: one row per professor with aggregated scores
    const professorMap = new Map<string, {
      ids: string[];
      name: string;
      courses: string[];
      levels: string[];
      classNames: string[];
    }>();

    for (const prof of profs) {
      const key = prof.name.trim().toLowerCase();
      if (!professorMap.has(key)) {
        professorMap.set(key, { ids: [], name: prof.name, courses: [], levels: [], classNames: [] });
      }
      const entry = professorMap.get(key)!;
      entry.ids.push(prof.id);
      if (!entry.courses.includes(prof.course)) entry.courses.push(prof.course);
      if (!entry.levels.includes(prof.level)) entry.levels.push(prof.level);
      if (!entry.classNames.includes(prof.className)) entry.classNames.push(prof.className);
    }

    const rows: any[] = [];
    for (const group of professorMap.values()) {
      const profEvals = evals.filter(e => group.ids.includes(e.professorId));
      const scoresSum: Record<string, number> = {};
      profEvals.forEach(e => {
        Object.entries(e.scores).forEach(([key, val]) => {
          if (!scoresSum[key]) scoresSum[key] = 0;
          scoresSum[key] += Number(val);
        });
      });
      const avgScores: Record<string, any> = {};
      Object.keys(scoresSum).forEach(k => {
        avgScores[CRITERIA_LABELS[k] || k] = profEvals.length > 0
          ? Number((scoresSum[k] / profEvals.length).toFixed(2))
          : '';
      });

      let totalScore = 0, count = 0;
      Object.values(avgScores).forEach(v => { if (v !== '') { totalScore += Number(v); count++; } });

      rows.push({
        'Nom': group.name,
        'Matières': group.courses.join(' | '),
        'Classes': group.classNames.join(', '),
        'Niveaux': group.levels.join(', '),
        'Nb Évaluations': profEvals.length,
        'Score Moyen Global': count > 0 ? Number((totalScore / count).toFixed(2)) : 'N/A',
        ...avgScores,
      });
    }

    rows.sort((a, b) => b['Nb Évaluations'] - a['Nb Évaluations']);

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, 'Résultats');

    // Summary sheet
    const summaryRows = [
      { 'Statistique': 'Total enseignants uniques', 'Valeur': professorMap.size },
      { 'Statistique': 'Total évaluations', 'Valeur': evals.length },
      { 'Statistique': 'Enseignants évalués', 'Valeur': rows.filter(r => r['Nb Évaluations'] > 0).length },
      { 'Statistique': 'Date export', 'Valeur': new Date().toLocaleDateString('fr-FR') },
    ];
    const wsSummary = xlsx.utils.json_to_sheet(summaryRows);
    xlsx.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=resultats_upb_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buf);
  }
}
