/**
 * Structured Logger with Pino
 * 
 * Provides structured JSON logging for Cloud Functions with:
 * - Request correlation IDs
 * - Automatic request/response logging
 * - Error serialization
 * - Performance timing
 */

import pino from 'pino';

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';

/**
 * Base logger configuration
 * - Pretty prints in development
 * - JSON in production (for Cloud Logging)
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
  ...(IS_PRODUCTION
    ? {
        // Production: JSON format for Cloud Logging
        formatters: {
          level: (label) => ({ severity: label.toUpperCase() }),
        },
        messageKey: 'message',
      }
    : {
        // Development: Pretty print
        transport: {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        },
      }),
  base: {
    service: 'skillswap-api',
    version: process.env.npm_package_version || '0.1.0',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'secret',
      'apiKey',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(correlationId: string, userId?: string) {
  return logger.child({
    correlationId,
    ...(userId && { userId }),
  });
}

/**
 * Log levels convenience exports
 */
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};

export default logger;
