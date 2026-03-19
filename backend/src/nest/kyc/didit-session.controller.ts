import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { FirebaseAuthGuard } from '../common/firebase-auth.guard';

const IS_EMULATOR = Boolean(
  process.env.FUNCTIONS_EMULATOR ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIREBASE_EMULATOR_HUB,
);

@Controller('didit')
export class DiditSessionController {
  private readonly logger = new Logger(DiditSessionController.name);

  /**
   * POST /api/didit/session
   *
   * Creates a new Didit identity-verification session for the calling user (or
   * an anonymous `vendor` string for pre-signup flows) and returns the redirect
   * URL to which the client should send the user.
   *
   * Body:
   *   { vendor?: string }  – UID or any stable identifier; defaults to the
   *                          authenticated user's UID when omitted.
   *
   * Response:
   *   { session_id: string; url: string }
   */
  @Post('session')
  async createSession(
    @Body() body: { vendor?: string; language?: string },
    @Req() req: Request,
  ) {
    // --- Resolve vendor / uid -------------------------------------------------
    let uid: string | null = null;

    // Try bearer token (optional auth – session can also be created pre-signup)
    const authHeader = (req.headers.authorization || '').toString();
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (match) {
      try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        uid = decoded.uid;

        // Block suspended accounts
        const userSnap = await admin.firestore().collection('users').doc(decoded.uid).get();
        const status = (userSnap.data() as any)?.accountStatus || 'active';
        if (status !== 'active') {
          throw new HttpException('Account is not active', HttpStatus.FORBIDDEN);
        }
      } catch (e) {
        if (e instanceof HttpException) throw e;
        // Invalid token – treat as anonymous (pre-signup flow)
        uid = null;
      }
    }

    const vendor = body?.vendor || uid || null;
    if (!vendor) {
      throw new BadRequestException('vendor is required for unauthenticated calls');
    }

    // --- Emulator shortcut ---------------------------------------------------
    if (IS_EMULATOR) {
      this.logger.warn('[DiditSession] Emulator mode – returning mock session');
      const callbackUrl =
        process.env.DIDIT_CALLBACK_URL ||
        'http://localhost:3000/kyc/done';
      const mockUrl = `${callbackUrl}?verificationSessionId=dev-session-${Date.now()}&vendor=${encodeURIComponent(String(vendor))}`;
      // Store reference so /kyc/sync can look it up
      await admin.firestore().collection('kycReferences').doc(vendor).set({
        uid: vendor,
        provider: 'dev',
        session_id: `dev-session-${Date.now()}`,
        createdAt: new Date(),
      }, { merge: true });
      return { session_id: `dev-session-${Date.now()}`, url: mockUrl };
    }

    // --- Call Didit API -------------------------------------------------------
    const apiKey = process.env.DIDIT_API_KEY;
    const baseUrl = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
    const workflowId = process.env.DIDIT_WORKFLOW_ID;
    const requestedLanguage = String(body?.language || process.env.DIDIT_SESSION_LANGUAGE || 'ar').trim();
    const language = requestedLanguage || 'ar';
    // APP_URL is a backend-only env var (e.g. https://skillswap-69yxi.web.app)
    // DIDIT_CALLBACK_URL takes priority; fall back to APP_URL + /kyc/done
    const callbackUrl = process.env.DIDIT_CALLBACK_URL ||
      (process.env.APP_URL ? `${process.env.APP_URL}/kyc/done` : undefined);

    if (!apiKey) {
      this.logger.error('[DiditSession] DIDIT_API_KEY is not set');
      throw new HttpException('KYC service is not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!workflowId) {
      this.logger.error('[DiditSession] DIDIT_WORKFLOW_ID is not set');
      throw new HttpException('KYC service is not configured (workflow)', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const response = await axios.post(
        `${baseUrl}/v3/session/`,
        {
          workflow_id: workflowId,
          vendor_data: String(vendor),
          language,
          ...(callbackUrl ? { callback: callbackUrl } : {}),
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
          validateStatus: () => true,
        },
      );

      if (response.status < 200 || response.status >= 300) {
        const detail = response.data?.message || response.data?.error || response.statusText;
        this.logger.error({ status: response.status, detail }, '[DiditSession] Didit API error');
        throw new HttpException(
          `Failed to create verification session: ${detail || 'unknown error'}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = response.data;
      const sessionId = String(data?.session_id || data?.id || data?.sessionId || '');
      const url = String(data?.url || data?.verification_url || data?.verificationUrl || '');

      if (!sessionId || !url) {
        this.logger.error({ data }, '[DiditSession] Unexpected Didit response shape');
        throw new HttpException('Invalid response from KYC provider', HttpStatus.BAD_GATEWAY);
      }

      // Persist session reference so /kyc/sync ownership checks work
      await admin.firestore().collection('kycReferences').doc(sessionId).set({
        uid: uid || vendor,
        provider: 'didit',
        session_id: sessionId,
        createdAt: new Date(),
      }, { merge: true });

      this.logger.log({ uid, vendor, sessionId }, '[DiditSession] Session created');
      return { session_id: sessionId, url };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error({ err: e?.message }, '[DiditSession] Failed to reach Didit');
      throw new HttpException('Could not reach verification service', HttpStatus.BAD_GATEWAY);
    }
  }
}
