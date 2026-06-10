import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

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

export interface DatabaseData {
  professors: Professor[];
  evaluations: Evaluation[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly dbPath = path.join(process.cwd(), 'data', 'db.json');
  private readonly dataDir = path.join(process.cwd(), 'data');

  async onModuleInit() {
    await this.initDatabase();
  }

  private async initDatabase() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      try {
        await fs.access(this.dbPath);
      } catch {
        // File doesn't exist, create it with default structure
        const defaultData: DatabaseData = { professors: [], evaluations: [] };
        await fs.writeFile(this.dbPath, JSON.stringify(defaultData, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize database', error);
    }
  }

  async readData(): Promise<DatabaseData> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read database', error);
      return { professors: [], evaluations: [] };
    }
  }

  async writeData(data: DatabaseData): Promise<void> {
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to write database', error);
    }
  }

  async getProfessors(): Promise<Professor[]> {
    const data = await this.readData();
    return data.professors;
  }

  async saveProfessors(professors: Professor[]): Promise<void> {
    const data = await this.readData();
    data.professors = professors;
    await this.writeData(data);
  }

  async addEvaluation(evaluation: Evaluation): Promise<void> {
    const data = await this.readData();
    data.evaluations.push(evaluation);
    await this.writeData(data);
  }

  async getEvaluations(): Promise<Evaluation[]> {
    const data = await this.readData();
    return data.evaluations;
  }
}
