import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { ProfessorEntity } from './entities/professor.entity';
import { EvaluationEntity } from './entities/evaluation.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProfessorEntity, EvaluationEntity])],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
