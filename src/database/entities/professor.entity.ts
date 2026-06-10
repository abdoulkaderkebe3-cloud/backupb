import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('professors')
export class ProfessorEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column()
  name: string;

  @Column()
  course: string;

  @Column()
  level: string;

  @Column()
  className: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  contact: string;
}
