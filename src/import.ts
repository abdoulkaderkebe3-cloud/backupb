import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExcelService } from './excel/excel.service';
import { DatabaseService } from './database/database.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const excelService = app.get(ExcelService);
  const dbService = app.get(DatabaseService);

  const workspaceDir = path.join(process.cwd(), '..');
  const files = fs.readdirSync(workspaceDir);
  const excelFiles = files.filter(f => f.endsWith('.xlsx'));

  console.log(`Found ${excelFiles.length} Excel files. Starting import...`);

  // Clear existing professors
  await dbService.saveProfessors([]);
  console.log('Cleared existing professor records.');

  let totalImported = 0;
  for (const file of excelFiles) {
    const filePath = path.join(workspaceDir, file);
    try {
      console.log(`Processing ${file}...`);
      const count = await excelService.processExcelFile(filePath);
      console.log(`-> Imported ${count} new professor records from ${file}.`);
      totalImported += count;
    } catch (e) {
      console.error(`Failed to process ${file}: ${e.message}`);
    }
  }

  console.log(`Import completed! Total new professors registered: ${totalImported}`);
  await app.close();
}

bootstrap();
