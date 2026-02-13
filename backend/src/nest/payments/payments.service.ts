import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createGeideaSession, handleGeideaWebhook, mockComplete } from '../../core/payments';
import { DURATION_IN_MONTHS, SubscriptionPlan } from '../../core/constants';
import { savePaymentRecord } from '../../core/postgres';
import { getUserDocument } from '../../core/membership';

@Injectable()
export class PaymentsService {
  async createSubscriptionSession(userId: string, plan: string, duration: string, currency?: string) {
    if (!userId) throw new BadRequestException('Missing userId');
    if (!plan || !duration) throw new BadRequestException('Missing plan or duration');
    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const planKey = plan as SubscriptionPlan;
    const durationKey = duration as keyof typeof DURATION_IN_MONTHS;
    const { paymentUrl, sessionId } = await createGeideaSession(userId, planKey, durationKey, currency);

    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    await admin.firestore().collection('payments').add({
      userId,
      plan: planKey,
      duration: durationKey,
      geideaSessionId: sessionId,
      status: 'PENDING',
      createdAt: createdAtVal,
    });
    await savePaymentRecord({
      userId,
      plan: planKey,
      duration: durationKey,
      geideaSessionId: sessionId,
      status: 'PENDING',
      createdAt: new Date(),
    });

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
