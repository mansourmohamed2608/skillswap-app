import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Security headers (only for standalone NestJS runs; index.ts handles production via Express)
  app.use(helmet());

  // Stricter rate limiting for sensitive endpoints (payments, KYC, admin)
  const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/payments', strictLimiter);
  app.use('/api/kyc', strictLimiter);
  app.use('/admin', strictLimiter);

  // General rate limiting for all other requests
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Enable CORS for local development and configured origins
  const isProd = process.env.NODE_ENV === 'production';
  const devOrigins = isProd ? [] : ['http://localhost:3000', 'http://localhost:9099', 'http://127.0.0.1:3000'];
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.EXPO_PUBLIC_APP_URL,
    ...devOrigins,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin === o)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
}

// Only used for local standalone runs; Firebase will mount via firebase-nest.ts
// Check if this file is being run directly (not imported as a module)
if (require.main === module) {
  bootstrap().catch((err) => {
    process.stderr.write(`[Nest] bootstrap failed: ${err?.message || err}\n`);
    process.exit(1);
  });
}

