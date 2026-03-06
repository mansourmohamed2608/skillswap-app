import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createGeideaSession, handleGeideaWebhook, mockComplete } from '../../core/payments';
import { DURATION_IN_MONTHS, PLAN_LISTING_LIMITS, SubscriptionPlan } from '../../core/constants';
import { savePaymentRecord } from '../../core/postgres';
import { getUserDocument } from '../../core/membership';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async createSubscriptionSession(userId: string, plan: string, duration: string, currency?: string) {
    if (!userId) throw new BadRequestException('Missing userId');
    if (!plan || !duration) throw new BadRequestException('Missing plan or duration');
    // Validate against the canonical constant maps before any Firestore or gateway call.
    const validPlans = new Set(Object.keys(PLAN_LISTING_LIMITS) as SubscriptionPlan[]);
    const validDurations = new Set(Object.keys(DURATION_IN_MONTHS));
    if (!validPlans.has(plan as SubscriptionPlan)) throw new BadRequestException('Invalid plan');
    if (!validDurations.has(duration)) throw new BadRequestException('Invalid duration');
    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const planKey = plan as SubscriptionPlan;
    const durationKey = duration as keyof typeof DURATION_IN_MONTHS;
    const { paymentUrl, sessionId } = await createGeideaSession(userId, planKey, durationKey, currency);

    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    // Write to Postgres first (source of truth for billing). If it fails, do not
    // create a Firestore record so both stores remain consistent.
    await savePaymentRecord({
      userId,
      plan: planKey,
      duration: durationKey,
      geideaSessionId: sessionId,
      status: 'PENDING',
      createdAt: new Date(),
    });

    // Write to Firestore for real-time client sync. Log divergence if this fails.
    try {
      await admin.firestore().collection('payments').add({
        userId,
        plan: planKey,
        duration: durationKey,
        geideaSessionId: sessionId,
        status: 'PENDING',
        createdAt: createdAtVal,
      });
    } catch (fsErr) {
      this.logger.error('[Payments] Firestore write failed after Postgres write succeeded — reconciliation needed', {
        userId, sessionId, error: String((fsErr as any)?.message || fsErr),
      });
    }

    return { paymentUrl, sessionId };
  }

  async handleWebhook(rawBody: Buffer, headers?: Record<string, any>) {
    if (!rawBody || !(rawBody instanceof Buffer)) throw new BadRequestException('Missing raw body');
    const result = await handleGeideaWebhook(rawBody, headers);
    return { received: true, alreadyProcessed: result?.alreadyProcessed || false };
  }

  async completeMock(sessionId: string) {
    if (!sessionId) throw new BadRequestException('Missing sessionId');
    await mockComplete(sessionId);
    return { ok: true };
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
