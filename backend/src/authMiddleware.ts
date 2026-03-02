import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { logger } from './core/logger';

/**
 * Express middleware that verifies a Firebase Authentication bearer token.
 *
 * Clients should include the Firebase ID token in the Authorization header as:
 *     Authorization: Bearer <token>
 *
 * On success, the decoded token (containing uid, email, etc.) is attached to `req.user`.
 * On failure, a 401 response is sent.  This middleware should be applied to routes
 * that require the caller to be authenticated.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = (req.headers.authorization || '').toString();
  const match = /^Bearer (.+)$/.exec(authHeader);
  if (!match) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = match[1];
  admin
    .auth()
    .verifyIdToken(token)
    .then((decoded) => {
      // Attach decoded token to request for downstream handlers
      (req as any).user = decoded;
      next();
    })
    .catch((err) => {
      logger.error({ err }, 'Error verifying Firebase ID token');
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}