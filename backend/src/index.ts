import * as dotenv from 'dotenv';
dotenv.config();
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import express from 'express';

// Set default region for all Gen 2 functions
setGlobalOptions({ region: 'europe-west3' });
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getNestServer } from './nest/firebase-nest';
import { ensureAdminApp } from './core/firebase-admin';
import { logger } from './core/logger';
import { correlationIdMiddleware, CORRELATION_ID_HEADER } from './core/correlation-id';

const app = express();
// Trust first proxy (Cloud Functions / Firebase) to get real client IP
app.set('trust proxy', 1);

app.use((req, _res, next) => {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  const candidate = xf.split(',')[0]?.trim();
  (req as any)._clientIp = req.ip || candidate || '127.0.0.1';
  next();
});

// Add correlation ID and structured logging to all requests
app.use(correlationIdMiddleware);

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';

// Log startup
logger.info({ event: 'server_start', isProduction: IS_PRODUCTION }, 'SkillSwap API starting');

// Production origins - add your custom domain here
const PROD_ORIGINS = new Set([
  'https://skillswap-69yxi.web.app',
  'https://skillswap-69yxi.firebaseapp.com',
]);

// Development origins
const DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const ALLOWED_ORIGINS = IS_PRODUCTION ? PROD_ORIGINS : new Set([...PROD_ORIGINS, ...DEV_ORIGINS]);
const EXTRA_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
for (const origin of EXTRA_ORIGINS) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'https:' || (!IS_PRODUCTION && parsed.protocol === 'http:')) {
      ALLOWED_ORIGINS.add(origin);
    } else {
      logger.warn({ origin, event: 'cors_invalid_origin' }, 'Skipping non-https extra CORS origin');
    }
  } catch {
    logger.warn({ origin, event: 'cors_invalid_origin' }, 'Skipping malformed extra CORS origin');
  }
}

function isHostedAppOrigin(origin: string) {
  return /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.hosted\.app$/i.test(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman) in development
    if (!origin && !IS_PRODUCTION) return cb(null, true);
    if (!origin || ALLOWED_ORIGINS.has(origin) || isHostedAppOrigin(origin)) return cb(null, true);
    logger.warn({ origin, event: 'cors_blocked' }, 'CORS blocked origin');
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Security headers - protects against XSS, clickjacking, MIME sniffing
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // No unsafe-inline; use nonce-based CSP if inline scripts are needed
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.geidea.net"], // For Geidea payment iframe
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some Firebase features
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const rawWebhookPaths = ['/payments/webhook'];
const rawMiddleware = express.raw({ type: '*/*', limit: '10mb' });
const matchesWebhookPath = (req: express.Request, p: string) => {
  const original = req.originalUrl || '';
  const path = req.path || '';
  const pathsToCheck = [original, path];
  return pathsToCheck.some((candidate) =>
    candidate.startsWith(p) ||
    candidate.startsWith(`${p}/`) ||
    candidate.startsWith(`/api${p}`) ||
    candidate.startsWith(`/api${p}/`)
  );
};
const isWebhookRequest = (req: express.Request) =>
  rawWebhookPaths.some((p) => matchesWebhookPath(req, p));

// Multipart routes that should skip body parsing - let NestJS handle them directly
const multipartPaths = ['/kyc/id/verify'];
const isMultipartRoute = (req: express.Request) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return false;
  const original = req.originalUrl || '';
  const path = req.path || '';
  return multipartPaths.some((p) =>
    original.includes(p) || path.includes(p)
  );
};
const isPaymentsWebhookRequest = (req: express.Request) => matchesWebhookPath(req, '/payments/webhook');
const getWebhookSignature = (req: express.Request) =>
  (req.headers['x-signature'] as string) ||
  (req.headers['x-geidea-signature'] as string) ||
  (req.headers['geidea-signature'] as string) ||
  '';
const getPaymentsSignature = (req: express.Request) =>
  (req.headers['x-geidea-signature'] as string) ||
  (req.headers['geidea-signature'] as string) ||
  '';
const getWebhookSigPrefix = (signature: string) => (signature ? signature.slice(0, 8) : 'nosig');
const hasWebhookSignature = (req: express.Request) => Boolean(getWebhookSignature(req));

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: (req) => (hasWebhookSignature(req) ? 600 : 5),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const xf = (req.headers['x-forwarded-for'] as string) || '';
    const ip = (req as any)._clientIp || req.ip || xf.split(',')[0]?.trim() || '127.0.0.1';
    const signature = getWebhookSignature(req);
    const sigPrefix = getWebhookSigPrefix(signature);
    return signature ? `ip:${ip}:${sigPrefix}` : `ip:${ip}:nosig`;
  },
});
app.use((req, res, next) => {
  if (!isWebhookRequest(req)) return next();
  return (webhookLimiter as any)(req, res, next);
});

app.use((req, res, next) => {
  if (isWebhookRequest(req)) {
    return (rawMiddleware as any)(req, res, () => {
      (req as any).rawBody = req.body as Buffer;
      (req as any).rawBodyText = req.body ? (req.body as Buffer).toString('utf8') : undefined;
      next();
    });
  }
  return next();
});

// DO NOT add express.json() here - it will consume the request body before NestJS can read it
// NestJS handles body parsing internally based on the controller decorators
// Only webhooks need special raw body handling (handled in webhook middleware above)

const webhookHeaderGate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isWebhookRequest(req)) return next();
  if (isPaymentsWebhookRequest(req)) {
    const signature = getPaymentsSignature(req);
    if (signature) return next();
    const raw = (req as any).rawBody;
    if (!raw || !Buffer.isBuffer(raw)) return res.status(400).send('Missing raw body');
    try {
      const parsed = JSON.parse(raw.toString('utf8') || '{}');
      const hasId = Boolean(parsed?.id || parsed?.sessionId);
      if (!hasId) return res.status(400).send('Missing sessionId or id');
    } catch {
      return res.status(400).send('Invalid JSON body');
    }
    return next();
  }
  return next();
};
app.use((req, res, next) => {
  if (!isWebhookRequest(req)) return next();
  return webhookHeaderGate(req, res, next);
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const auth = (req.headers.authorization || '').toString();
    const m = /^Bearer (.+)$/.exec(auth);
    const uid = (req as any)?.user?.uid;
    if (uid) return `uid:${uid}`;
    if (m) return `token:${m[1].slice(0, 12)}`;
    const xf = (req.headers['x-forwarded-for'] as string) || '';
    const ip = (req as any)._clientIp || req.ip || xf.split(',')[0]?.trim() || '127.0.0.1';
    return `ip:${ip}`;
  },
});
app.use((req, res, next) => {
  if (isWebhookRequest(req)) return next();
  return (apiLimiter as any)(req, res, next);
});

// Stricter rate limit for account-creation endpoint to prevent enumeration / spam
// 20 attempts per hour per IP — well above legitimate use but blocks credential stuffing
const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many sign-up attempts. Try again later.' },
  validate: { ip: false, trustProxy: false, xForwardedForHeader: false },
  keyGenerator: (req) => {
    const xf = (req.headers['x-forwarded-for'] as string) || '';
    const ip = (req as any)._clientIp || req.ip || xf.split(',')[0]?.trim() || '127.0.0.1';
    return `bootstrap:${ip}`;
  },
});
const isBootstrapRequest = (req: express.Request) => {
  const p = (req.path || req.originalUrl || '').replace(/\/api/, '');
  return /^\/user\/bootstrap(\?|$)/.test(p) && req.method === 'POST';
};
app.use((req, res, next) => {
  if (!isBootstrapRequest(req)) return next();
  return (bootstrapLimiter as any)(req, res, next);
});

// ── Firebase App Check (optional, controlled by ENFORCE_APP_CHECK=true) ───────
// When enabled, every non-webhook, non-health request must carry a valid
// X-Firebase-AppCheck header.  Enable this after wiring App Check in the
// Firebase console and both client SDKs.
const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';
if (ENFORCE_APP_CHECK) {
  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip webhooks (signed separately) and health checks
    const path = req.path || req.originalUrl || '';
    if (isWebhookRequest(req) || /\/health(\/|$|\?)/.test(path)) return next();
    const appCheckToken = (req.headers['x-firebase-appcheck'] as string) || '';
    if (!appCheckToken) {
      logger.warn({ event: 'app_check_missing', path }, 'App Check token missing');
      return res.status(401).json({ statusCode: 401, message: 'App Check token required' });
    }
    try {
      const adminSdk = ensureAdminApp();
      await adminSdk.appCheck().verifyToken(appCheckToken);
      return next();
    } catch (e: any) {
      logger.warn({ event: 'app_check_invalid', path, error: e?.message }, 'Invalid App Check token');
      return res.status(401).json({ statusCode: 401, message: 'Invalid App Check token' });
    }
  });
}

let nestServerInitialized = false;
const initNestServer = async () => {
  if (nestServerInitialized) return;
  try {
    ensureAdminApp();
    nestServerInitialized = true;
  } catch (err) {
    logger.error({ event: 'nest_init_error', error: String(err) }, 'Failed to initialize admin app');
  }
};

app.use('/', (req, res, next) => {
  // Lazy-init Nest to avoid Firebase function load timeouts during discovery.
  const runRequest = async () => {
    try {
      await initNestServer();
      const server = await getNestServer();
      return (server as any)(req, res, next);
    } catch (err) {
      return next(err);
    }
  };
  runRequest().catch(next);
});

export const api = onRequest({ timeoutSeconds: 540 }, app);
export { moderateListing } from './moderation';
export { onListingWrite } from './search';
export { moderateWish } from './moderation';
export { moderateReview } from './moderation';
export { syncPublicProfile } from './public-profiles';
