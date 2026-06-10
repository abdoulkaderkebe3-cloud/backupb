import { IsString, IsNotEmpty, IsObject, IsOptional, MaxLength, MinLength } from 'class-validator';

export class SubmitEvaluationDto {
  @IsString()
  @IsNotEmpty({ message: 'professorId est requis' })
  professorId: string;

  @IsString()
  @IsNotEmpty({ message: 'level est requis' })
  level: string;

  @IsString()
  @IsNotEmpty({ message: 'className est requis' })
  className: string;

  @IsObject({ message: 'scores doit être un objet' })
  @IsNotEmpty({ message: 'scores est requis' })
  scores: Record<string, number>;

  @IsString()
  @IsOptional()
  studentHash?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Le commentaire ne peut pas dépasser 500 caractères' })
  comment?: string;
}

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(4, { message: 'Mot de passe trop court' })
  password: string;
}
