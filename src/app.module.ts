import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ExcelModule } from './excel/excel.module';
import { AuthModule } from './auth/auth.module';
import { ProfessorsController } from './professors/professors.controller';
import { EvaluateController } from './evaluate/evaluate.controller';
import { ResultsController } from './results/results.controller';
import { AdminController } from './admin/admin.controller';

@Module({
  imports: [
    // Load .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 60 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    DatabaseModule,
    ExcelModule,
    AuthModule,
  ],
  controllers: [
    AppController,
    ProfessorsController,
    EvaluateController,
    ResultsController,
    AdminController,
  ],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
