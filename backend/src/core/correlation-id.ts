/**
 * Request Correlation ID Middleware
 * 
 * Attaches a unique correlation ID to each request for distributed tracing.
 * - Reads existing X-Correlation-ID header if present (for forwarded requests)
 * - Generates a new UUID v4 if not present
 * - Attaches to response headers for client debugging
 * - Makes correlationId available in req object for logging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from './logger';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
      log: ReturnType<typeof createRequestLogger>;
    }
  }
}

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Middleware to attach correlation ID and scoped logger to requests
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing correlation ID or generate new one
  const correlationId = (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || uuidv4();
  
  // Attach to request
  req.correlationId = correlationId;
  
  // Create scoped logger with correlation ID
  // @ts-expect-error - uid might not exist yet
  const userId = req.uid as string | undefined;
  req.log = createRequestLogger(correlationId, userId);
  
  // Attach to response headers for client debugging
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  
  // Log request start — omit sensitive query parameters
  const SENSITIVE_QUERY_PARAMS = new Set(['token', 'secret', 'key', 'password', 'reset', 'code', 'apikey', 'api_key']);
  const safeQuery = Object.fromEntries(
    Object.entries(req.query).map(([k, v]) =>
      SENSITIVE_QUERY_PARAMS.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v]
    )
  );
  req.log.info({
    event: 'request_start',
    method: req.method,
    path: req.path,
    query: safeQuery,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  
  // Track response time
  const startTime = Date.now();
  
  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    req.log[logLevel]({
      event: 'request_end',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });
  
  next();
}

export default correlationIdMiddleware;
