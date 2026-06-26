import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import helmet from 'helmet';

let app: INestApplication;

async function getApp(): Promise<INestApplication> {
  if (!app) {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

    // Security headers
    app.use(helmet());

    // CORS: allow Vercel frontend origins
    app.enableCors({
      origin: true, // Allow all origins in serverless (CORS is less relevant for serverless APIs)
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    });

    // XSS sanitization
    app.use((req: any, _res: any, next: any) => {
      if (req.body && typeof req.body === 'object') {
        for (const key of Object.keys(req.body)) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key]
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
        }
      }
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const nestApp = await getApp();
  const httpAdapter = nestApp.getHttpAdapter();
  const instance = httpAdapter.getInstance();
  instance(req, res);
}
