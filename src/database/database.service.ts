import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorEntity } from './entities/professor.entity';
import { EvaluationEntity } from './entities/evaluation.entity';

export interface Professor {
  id: string;
  name: string;
  course: string;
  level: string;
  className: string;
  email?: string;
  contact?: string;
}

export interface Evaluation {
  id: string;
  professorId: string;
  studentHash: string;
  timestamp: string;
  level: string;
  className: string;
  scores: Record<string, number>;
  comment?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectRepository(ProfessorEntity)
    private professorsRepository: Repository<ProfessorEntity>,
    @InjectRepository(EvaluationEntity)
    private evaluationsRepository: Repository<EvaluationEntity>,
  ) {}

  async onModuleInit() {
    // TypeORM handles table creation via synchronize: true
  }

  async getProfessors(): Promise<Professor[]> {
    return this.professorsRepository.find();
  }

  async saveProfessors(professors: Professor[]): Promise<void> {
    // We use chunking to avoid too many parameters in a single SQL query
    const chunkSize = 500;
    for (let i = 0; i < professors.length; i += chunkSize) {
      const chunk = professors.slice(i, i + chunkSize);
      await this.professorsRepository.save(chunk);
    }
  }

  async addEvaluation(evaluation: Evaluation): Promise<void> {
    await this.evaluationsRepository.save(evaluation);
  }

  async getEvaluations(): Promise<Evaluation[]> {
    return this.evaluationsRepository.find();
  }
}
