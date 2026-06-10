import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs/promises';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dbService = app.get(DatabaseService);

  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  
  try {
    const content = await fs.readFile(dbPath, 'utf8');
    const data = JSON.parse(content);

    console.log(`Found ${data.professors.length} professors and ${data.evaluations.length} evaluations in db.json.`);

    if (data.professors && data.professors.length > 0) {
      console.log('Migrating professors...');
      await dbService.saveProfessors(data.professors);
      console.log('Professors migrated.');
    }

    if (data.evaluations && data.evaluations.length > 0) {
      console.log('Migrating evaluations...');
      const chunkSize = 500;
      for (let i = 0; i < data.evaluations.length; i += chunkSize) {
        const chunk = data.evaluations.slice(i, i + chunkSize);
        await Promise.all(chunk.map(ev => dbService.addEvaluation(ev)));
      }
      console.log('Evaluations migrated.');
    }

    console.log('Migration to PostgreSQL completed successfully!');
  } catch (err) {
    console.error('Migration failed. Make sure data/db.json exists and the connection string is valid.', err);
  } finally {
    await app.close();
  }
}

bootstrap();
