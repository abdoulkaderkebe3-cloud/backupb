import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('evaluations')
export class EvaluationEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column()
  professorId: string;

  @Column()
  studentHash: string;

  @Column()
  timestamp: string;

  @Column()
  level: string;

  @Column()
  className: string;

  @Column('jsonb')
  scores: Record<string, number>;

  @Column({ type: 'text', nullable: true })
  comment: string;
}
