import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProfessorDocument = Professor & Document;

@Schema({ timestamps: true })
export class Professor {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  course: string;

  @Prop({ required: true })
  level: string;

  @Prop({ required: true })
  className: string;

  @Prop()
  email?: string;

  @Prop()
  contact?: string;
}

export const ProfessorSchema = SchemaFactory.createForClass(Professor);
