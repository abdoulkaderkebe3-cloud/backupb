import { Controller, Get, Query } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('api/professors')
export class ProfessorsController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get()
  async getProfessors(
    @Query('level') level?: string,
    @Query('className') className?: string,
  ) {
    let profs = await this.dbService.getProfessors();

    if (level) {
      profs = profs.filter(p => p.level === level);
    }
    if (className) {
      profs = profs.filter(p => p.className === className);
    }

    return profs;
  }

  @Get('levels')
  async getLevelsAndClasses() {
    const profs = await this.dbService.getProfessors();
    const result: Record<string, string[]> = {};
    
    // Seed default filières for Licence levels to make sure the dropdown matches expectations
    const defaultLicenceFilieres = ['3EA', 'ASSRI', 'MIAGE', 'SEA', 'SEG', 'SJAP'];
    result['LICENCE 1'] = [...defaultLicenceFilieres];
    result['LICENCE 2'] = [...defaultLicenceFilieres];
    result['LICENCE 3'] = [...defaultLicenceFilieres];

    for (const p of profs) {
      if (!result[p.level]) {
        result[p.level] = [];
      }
      if (!result[p.level].includes(p.className)) {
        result[p.level].push(p.className);
      }
    }

    // Sort class names alphabetically for a clean display
    for (const lvl of Object.keys(result)) {
      result[lvl].sort();
    }

    return result;
  }
}
