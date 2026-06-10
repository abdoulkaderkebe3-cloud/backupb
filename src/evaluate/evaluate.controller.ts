import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService, Evaluation } from '../database/database.service';
import { SubmitEvaluationDto } from './evaluate.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('api/evaluate')
export class EvaluateController {
  constructor(private readonly dbService: DatabaseService) {}

  @Post()
  async submitEvaluation(@Body() data: SubmitEvaluationDto) {
    // Validate score values (must be 1-5)
    for (const [key, val] of Object.entries(data.scores)) {
      const num = Number(val);
      if (isNaN(num) || num < 1 || num > 5) {
        throw new HttpException(
          `Score invalide pour ${key}: doit être entre 1 et 5`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Check for double voting based on studentHash and professorId
    if (data.studentHash) {
      const evals = await this.dbService.getEvaluations();
      const alreadyVoted = evals.find(
        e => e.professorId === data.professorId && e.studentHash === data.studentHash
      );
      
      if (alreadyVoted) {
        throw new HttpException('Vous avez déjà évalué ce professeur', HttpStatus.CONFLICT);
      }
    }

    const newEvaluation: Evaluation = {
      id: uuidv4(),
      professorId: data.professorId,
      studentHash: data.studentHash || 'anonymous',
      timestamp: new Date().toISOString(),
      level: data.level,
      className: data.className,
      scores: data.scores,
      comment: data.comment,
    };

    await this.dbService.addEvaluation(newEvaluation);
    return { success: true, message: 'Evaluation enregistrée avec succès.' };
  }
}
