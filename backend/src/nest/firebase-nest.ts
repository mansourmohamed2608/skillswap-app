import express from 'express';
import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';
import { ensureAdminApp } from '../core/firebase-admin';

let nestAppPromise: Promise<{ app: INestApplication; server: Express }> | null = null;

async function bootstrapNest() {
  ensureAdminApp();
  await import('reflect-metadata');
  const [{ NestFactory }, { ExpressAdapter }, { ValidationPipe }] = await Promise.all([
    import('@nestjs/core'),
    import('@nestjs/platform-express'),
    import('@nestjs/common'),
  ]);
  const server = express();
  const adapter = new ExpressAdapter(server);
  const { AppModule } = await import('./app.module');
  // Let NestJS handle body parsing - disable default body parser for multipart routes
  const app = await NestFactory.create(AppModule, adapter, { 
    logger: false,
    rawBody: true, // Enable rawBody for webhook verification and multipart handling
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // When running inside Firebase Functions, Hosting rewrites /api/** → the function
  // with the full path (including /api). Set the global prefix so all routes
  // are reachable at /api/<route> (e.g. /api/health, /api/listings, etc.)
  app.setGlobalPrefix('api');
  await app.init();
  return { app, server };
}

/**
 * Returns the single cached Nest application (and its Express server).
 */
export function getNestApp() {
  if (!nestAppPromise) {
    nestAppPromise = bootstrapNest();
  }
  return nestAppPromise.then(({ app }) => app);
}

/**
 * Returns the Express instance hosting the Nest app (cached).
 */
export function getNestServer() {
  if (!nestAppPromise) {
    nestAppPromise = bootstrapNest();
  }
  return nestAppPromise.then(({ server }) => server);
}
