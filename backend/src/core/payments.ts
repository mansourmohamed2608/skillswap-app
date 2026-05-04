import axios from 'axios';
import * as admin from 'firebase-admin';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DURATION_IN_MONTHS, SubscriptionPlan } from './constants';
import { saveDonationRecord, savePaymentRecord, saveTokenTransactionRecord, updateDonationStatus, updatePaymentStatus } from './postgres';
import { sendEmail, sendEmailNotification, sendInAppNotification, sendPushNotification } from './notifications';
import { logger } from './logger';

// SECURITY: Strict environment detection - never trust emulator flags in production
// K_SERVICE is always set in Firebase Functions v2 / Cloud Run environments.
const IS_PRODUCTION = process.env.NODE_ENV === 'production' ||
  process.env.K_SERVICE !== undefined; // Cloud Run/Functions v2 indicator

const IS_EMULATOR = !IS_PRODUCTION && Boolean(
  process.env.FUNCTIONS_EMULATOR ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.FIREBASE_EMULATOR_HUB
);

// USE_MOCK_PAYMENTS=1 is explicitly allowed even in production for demo/pre-launch mode.
// Remove or set to 0 once Geidea is fully configured.
const USE_MOCK =
  process.env.USE_MOCK_PAYMENTS === '1' ||
  (!IS_PRODUCTION && IS_EMULATOR);
const ALLOW_UNCONFIGURED_PAYMENT_FALLBACK = process.env.ALLOW_UNCONFIGURED_PAYMENT_FALLBACK !== '0';

// Security: Startup safety checks — warn loudly if insecure modes are active in production
if (IS_PRODUCTION && USE_MOCK) {
  logger.warn('[Payments] SECURITY WARNING: Mock payment mode is ENABLED in production (USE_MOCK_PAYMENTS=1). Set USE_MOCK_PAYMENTS=0 to enforce real Geidea payments.');
}
if (IS_PRODUCTION && ALLOW_UNCONFIGURED_PAYMENT_FALLBACK && !process.env.GEIDEA_MERCHANT_ID) {
  logger.warn('[Payments] SECURITY WARNING: ALLOW_UNCONFIGURED_PAYMENT_FALLBACK is enabled but GEIDEA_MERCHANT_ID is not configured in production. Real payments will fall back to mock.');
}

const PRICING_EGP: Record<SubscriptionPlan, Record<'3_months' | '6_months' | '12_months', number>> = {
  Basic: { '3_months': 30, '6_months': 50, '12_months': 80 },
  Standard: { '3_months': 50, '6_months': 80, '12_months': 100 },
  Pro: { '3_months': 80, '6_months': 100, '12_months': 120 },
  Business: { '3_months': 600, '6_months': 600, '12_months': 600 },
};

const PRICING_SAR: Record<SubscriptionPlan, Record<'3_months' | '6_months' | '12_months', number>> = {
  Basic: { '3_months': 25, '6_months': 45, '12_months': 75 },
  Standard: { '3_months': 45, '6_months': 75, '12_months': 95 },
  Pro: { '3_months': 75, '6_months': 95, '12_months': 115 },
  Business: { '3_months': 600, '6_months': 600, '12_months': 600 },
};

type DurationKey = keyof typeof DURATION_IN_MONTHS;
type KnownDuration = '3_months' | '6_months' | '12_months';

function toPriceKey(duration: DurationKey): KnownDuration {
  return duration as KnownDuration;
}

function getGeideaWebhookSecret(): string | undefined {
  return process.env.GEIDEA_WEBHOOK_SECRET;
}

const ALLOWED_GEIDEA_BASE_URLS = new Set([
  'https://api.geidea.net',
  'https://sandbox.geidea.net',
]);

function getGeideaBaseUrl(): string {
  const url = (process.env.GEIDEA_BASE_URL || 'https://api.geidea.net').replace(/\/$/, '');
  if (!ALLOWED_GEIDEA_BASE_URLS.has(url)) {
    throw new Error(`Invalid GEIDEA_BASE_URL: must be one of ${[...ALLOWED_GEIDEA_BASE_URLS].join(', ')}`);
  }
  return url;
}

/** Wrap an axios gateway call so that the full response body is never leaked into logs/stack traces. */
async function callGateway<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    const message: string = String(err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Payment gateway error').slice(0, 200);
    logger.error(`[Payments] Gateway call failed — HTTP ${status ?? 'unknown'}: ${message}`);
    throw new Error(`Payment gateway error (HTTP ${status ?? 'unknown'}): ${message}`);
  }
}

function normalizeSignature(sig: string): string {
  return sig.startsWith('sha256=') ? sig.slice(7) : sig;
}

function constantTimeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  if (timingSafeEqual) return timingSafeEqual(ab, bb);
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function verifyGeideaSignature(rawBody: Buffer, headers?: Record<string, any>): { verified: boolean; skipped?: boolean } {
  const secret = getGeideaWebhookSecret();
  const signatureRaw = String(
    headers?.['x-geidea-signature'] ||
      headers?.['geidea-signature'] ||
      headers?.['x-signature'] ||
      ''
  );
  const timestamp = String(headers?.['x-timestamp'] || headers?.['x-geidea-timestamp'] || '');
  
  // SECURITY: Only allow unsigned webhooks in non-production emulator mode
  const allowUnsigned = !IS_PRODUCTION && (
    IS_EMULATOR ||
    USE_MOCK
  );

  if (!secret) {
    if (allowUnsigned) {
      logger.warn('[Payments] Webhook secret not configured; skipping signature verification (non-production mode).');
      return { verified: false, skipped: true };
    }
    throw new Error('Geidea webhook secret not configured');
  }
  if (!signatureRaw) {
    if (allowUnsigned) {
      logger.warn('[Payments] Webhook signature absent; skipping verification (non-production mode).');
      return { verified: false, skipped: true };
    }
    throw new Error('Missing Geidea webhook signature');
  }

  const signature = normalizeSignature(signatureRaw);
  const bodyText = rawBody.toString('utf8');
  const hmac = createHmac('sha256', secret).update(bodyText).digest('hex');
  const hmacWithTs = timestamp
    ? createHmac('sha256', secret).update(`${timestamp}.${bodyText}`).digest('hex')
    : null;
  const verified = constantTimeEq(signature, hmac) || (hmacWithTs ? constantTimeEq(signature, hmacWithTs) : false);
  if (!verified && !allowUnsigned) {
    throw new Error('Invalid Geidea webhook signature');
  }
  return { verified, skipped: !verified };
}

export async function createGeideaSession(
  userId: string,
  plan: SubscriptionPlan,
  duration: DurationKey,
  currency: string = 'EGP'
): Promise<{ paymentUrl: string; sessionId: string }> {
  const curr = (currency || 'EGP').toUpperCase();
  const table = curr === 'SAR' ? PRICING_SAR : PRICING_EGP;
  const price = table[plan][toPriceKey(duration)];

  if (USE_MOCK) {
    const sessionId = `mock_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${price}&currency=${currency}`;
    return { paymentUrl, sessionId };
  }

  const merchantId = process.env.GEIDEA_MERCHANT_ID;
  const apiPassword = process.env.GEIDEA_API_PASSWORD;
  const callbackUrl = process.env.GEIDEA_CALLBACK_URL;
  const baseUrl = getGeideaBaseUrl();

  if (!merchantId || !apiPassword || !callbackUrl) {
    if (ALLOW_UNCONFIGURED_PAYMENT_FALLBACK) {
      const sessionId = `mock_fallback_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${price}&currency=${currency}`;
      logger.warn('[Payments] Geidea config missing. Using mock checkout fallback session.');
      return { paymentUrl, sessionId };
    }
    throw new Error('Geidea config missing. Set GEIDEA_MERCHANT_ID, GEIDEA_API_PASSWORD, GEIDEA_CALLBACK_URL env vars OR enable mock via USE_MOCK_PAYMENTS=1.');
  }

  const url = `${baseUrl}/v2/payments`;
  const payload = {
    merchantId,
    amount: price.toFixed(2),
    currency,
    callbackUrl,
    customer: { id: userId },
  };

  const resp = await callGateway(() => axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `APIKey ${apiPassword}`,
    },
    timeout: 10000,
  }));

  const data = (resp as any).data;
  const paymentUrl = data.redirectUrl || data.paymentUrl;
  const sessionId = data.id || data.sessionId;
  if (!paymentUrl || !sessionId) {
    throw new Error('Unexpected gateway response (missing paymentUrl/sessionId)');
  }

  return { paymentUrl, sessionId };
}

export async function createGeideaDonationSession(args: {
  amount: number;
  currency?: string;
  donorEmail?: string;
  donorName?: string;
  referenceId?: string;
}): Promise<{ paymentUrl: string; sessionId: string }> {
  const currency = (args.currency || 'EGP').toUpperCase();
  const amount = Number(args.amount || 0);
  if (!(amount > 0)) throw new Error('Invalid donation amount');

  if (USE_MOCK) {
    const sessionId = `mock_donation_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${amount}&currency=${currency}`;
    return { paymentUrl, sessionId };
  }

  const merchantId = process.env.GEIDEA_MERCHANT_ID;
  const apiPassword = process.env.GEIDEA_API_PASSWORD;
  const callbackUrl = process.env.GEIDEA_CALLBACK_URL;
  const baseUrl = getGeideaBaseUrl();

  if (!merchantId || !apiPassword || !callbackUrl) {
    if (ALLOW_UNCONFIGURED_PAYMENT_FALLBACK) {
      const sessionId = `mock_fallback_donation_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${amount}&currency=${currency}`;
      logger.warn('[Payments] Geidea config missing. Using donation mock checkout fallback session.');
      return { paymentUrl, sessionId };
    }
    throw new Error('Geidea config missing. Set GEIDEA_MERCHANT_ID, GEIDEA_API_PASSWORD, GEIDEA_CALLBACK_URL env vars OR enable mock via USE_MOCK_PAYMENTS=1.');
  }

  const payload: Record<string, any> = {
    merchantId,
    amount: amount.toFixed(2),
    currency,
    callbackUrl,
  };
  if (args.donorEmail || args.donorName) {
    payload.customer = {
      id: args.donorEmail || 'guest',
      email: args.donorEmail,
      name: args.donorName,
    };
  }
  if (args.referenceId) payload.merchantReferenceId = args.referenceId;

  const resp = await callGateway(() => axios.post(`${baseUrl}/v2/payments`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `APIKey ${apiPassword}`,
    },
    timeout: 10000,
  }));

  const data = (resp as any).data || {};
  const paymentUrl = data.redirectUrl || data.paymentUrl;
  const sessionId = data.id || data.sessionId;
  if (!paymentUrl || !sessionId) {
    throw new Error('Unexpected gateway response (missing paymentUrl/sessionId)');
  }
  return { paymentUrl, sessionId };
}

export async function handleGeideaWebhook(rawBody: Buffer, headers?: Record<string, any>): Promise<{ ok: boolean; alreadyProcessed?: boolean }> {
  if (!rawBody || !Buffer.isBuffer(rawBody)) throw new Error('Missing raw body');
  const rawHash = createHash('sha256').update(rawBody).digest('hex');
  const rawText = rawBody.toString('utf8');
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON body');
  }

  const sessionId: string | undefined = parsed.sessionId || parsed.id;
  // SECURITY: mock sessions must never bypass signature verification in production
  const isMockSession = !IS_PRODUCTION && typeof sessionId === 'string' && sessionId.startsWith('mock_');
  const sigResult = isMockSession
    ? { verified: false, skipped: true }
    : verifyGeideaSignature(rawBody, headers || {});
  const incomingStatus = String(parsed.status || '').toUpperCase();
  const eventIdRaw: any = parsed.eventId || parsed.event_id || parsed.traceId;
  const eventId = eventIdRaw ? String(eventIdRaw) : undefined;
  const eventKey = eventId
    ? `geidea:${sessionId}:${eventId}`
    : `geidea:${sessionId}:${rawHash}`;
  if (!sessionId) throw new Error('Missing sessionId in webhook');
  logger.info({ eventKey, sessionId, status: incomingStatus }, '[Payments] webhook received');

  const eventsRef = admin.firestore().collection('paymentEvents').doc(String(eventKey));
  const tsVal =
    (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  try {
    await eventsRef.create({
      eventId: eventKey,
      providedEventId: eventId || null,
      sessionId,
      status: incomingStatus || 'UNKNOWN',
      receivedAt: tsVal,
      processed: false,
      source: 'payments_webhook',
      rawHash,
      signatureVerified: sigResult.verified,
      signatureSkipped: sigResult.skipped || false,
      headers: headers || {},
    });
  } catch (e: any) {
    if (e?.code === 6 || e?.code === 'already-exists' || /already exists/i.test(String(e?.message || ''))) {
      logger.info({ eventKey, sessionId }, '[Payments] webhook duplicate');
      return { ok: true, alreadyProcessed: true };
    }
    throw e;
  }

  const paymentsSnap = await admin
    .firestore()
    .collection('payments')
    .where('geideaSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (paymentsSnap.empty) {
    const donationSnap = await admin
      .firestore()
      .collection('wishDonations')
      .where('geideaSessionId', '==', sessionId)
      .limit(1)
      .get();
    if (donationSnap.empty) {
      // Check for token purchase transaction
      const tokenSnap = await admin
        .firestore()
        .collection('tokenTransactions')
        .where('geideaSessionId', '==', sessionId)
        .limit(1)
        .get();
      if (tokenSnap.empty) {
        logger.warn({ eventKey, sessionId }, '[Payments] payment not found');
        throw new Error(`Payment record not found for sessionId=${sessionId}`);
      }
      const tokenDoc = tokenSnap.docs[0];
      return handleTokenPurchaseWebhook({
        tokenTransactionRef: tokenDoc.ref,
        tokenData: tokenDoc.data() as any,
        incomingStatus,
        eventId,
        eventKey,
        eventsRef,
        updatedAtVal: tsVal,
      });
    }
    const donationDoc = donationSnap.docs[0];
    return handleDonationWebhook({
      donationRef: donationDoc.ref,
      donationData: donationDoc.data() as any,
      incomingStatus,
      eventId,
      eventKey,
      eventsRef,
      updatedAtVal: tsVal,
    });
  }

  const paymentDoc = paymentsSnap.docs[0];
  const paymentRef = paymentDoc.ref;

  const updatedAtVal =
    (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  await paymentRef.update({
    status: incomingStatus || 'UNKNOWN',
    ...(eventId ? { lastEventId: eventId } : { lastEventId: eventKey }),
    updatedAt: updatedAtVal,
  });

  await updatePaymentStatus(sessionId, incomingStatus || 'UNKNOWN');

  if (!(incomingStatus === 'PAID' || incomingStatus === 'SUCCESS')) {
    await eventsRef.set({ processed: true, processedAt: tsVal, note: 'status_update' }, { merge: true });
    return { ok: true };
  }

  const membershipGrantedAtVal =
    (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  const txResult = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(paymentRef);
    const data = snap.data() || {};
    const alreadyGranted = Boolean(data.membershipGranted);
    if (alreadyGranted) {
      return { shouldGrant: false, data };
    }
    tx.update(paymentRef, { membershipGranted: true, membershipGrantedAt: membershipGrantedAtVal });
    return { shouldGrant: true, data };
  });
  if (!txResult.shouldGrant) {
    await eventsRef.set({ processed: true, processedAt: tsVal, note: 'membership_already_granted' }, { merge: true });
    logger.info({ eventKey, sessionId }, '[Payments] membership already granted');
    return { ok: true, alreadyProcessed: true };
  }

  const paymentData = txResult.data as any;
  const userId = paymentData.userId as string;
  const plan = paymentData.plan as SubscriptionPlan;
  const duration = paymentData.duration as DurationKey;

  const months = DURATION_IN_MONTHS[duration];
  if (!months) throw new Error(`Invalid duration on payment: ${duration}`);

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);

  await admin.firestore().collection('users').doc(userId).set(
    {
      membership: {
        plan,
        startDate: now,
        endDate: end,
        listingCount: 0,
        bookingCount: 0,
        messageCount: 0,
        active: true,
      },
    },
    { merge: true }
  );

  try {
    await sendInAppNotification({
      userId,
      type: 'system',
      content: `Your ${plan} membership is now active. Enjoy your benefits!`,
      link: '/profile',
    });
    await sendPushNotification(userId, 'Membership activated', `Your ${plan} membership is active.`, '/profile');
    await sendEmailNotification(userId, 'Membership activated', `Your ${plan} membership is now active.`);
  } catch (e) {
    logger.warn({ err: e }, 'Failed to create membership notification');
  }

  await eventsRef.set({ processed: true, processedAt: tsVal, note: 'membership_granted' }, { merge: true });
  logger.info({ eventKey, sessionId, userId }, '[Payments] membership granted');
  return { ok: true };
}

async function handleDonationWebhook(args: {
  donationRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  donationData: Record<string, any>;
  incomingStatus: string;
  eventId?: string;
  eventKey: string;
  eventsRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  updatedAtVal: any;
}): Promise<{ ok: boolean; alreadyProcessed?: boolean }> {
  const { donationRef, donationData, incomingStatus, eventId, eventKey, eventsRef, updatedAtVal } = args;
  const sessionId = String(donationData.geideaSessionId || '');
  const wishId = String(donationData.wishId || '');
  const amount = Number(donationData.amount || 0);
  const donorEmail = donationData.donorEmail ? String(donationData.donorEmail) : '';

  if (!wishId || !(amount > 0)) {
    throw new Error('Donation record missing wishId or amount');
  }

  await donationRef.update({
    status: incomingStatus || 'UNKNOWN',
    ...(eventId ? { lastEventId: eventId } : { lastEventId: eventKey }),
    updatedAt: updatedAtVal,
  });
  if (sessionId) {
    await updateDonationStatus(sessionId, incomingStatus || 'UNKNOWN');
  }

  if (!(incomingStatus === 'PAID' || incomingStatus === 'SUCCESS')) {
    await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'status_update' }, { merge: true });
    return { ok: true };
  }

  const nowVal =
    (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  const txResult = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(donationRef);
    const data = snap.data() || {};
    const alreadyPaid = Boolean(data.paidAt || String(data.status || '').toUpperCase() === 'PAID' || String(data.status || '').toUpperCase() === 'SUCCESS');
    if (alreadyPaid) return { shouldUpdate: false, data };
    tx.update(donationRef, { status: incomingStatus, paidAt: nowVal, updatedAt: nowVal });
    const wishRef = admin.firestore().collection('wishes').doc(wishId);
    tx.update(wishRef, {
      totalDonated: admin.firestore.FieldValue.increment(amount),
      donationCount: admin.firestore.FieldValue.increment(1),
      updatedAt: nowVal,
    });
    return { shouldUpdate: true, data };
  });

  if (!txResult.shouldUpdate) {
    await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'donation_already_granted' }, { merge: true });
    return { ok: true, alreadyProcessed: true };
  }

  if (donorEmail) {
    const subject = 'Donation Receipt - SkillSwap';
    const text = `Thank you for your donation!\n\nAmount: ${amount} ${donationData.currency || 'EGP'}\nWish: ${wishId}\n\nWe appreciate your support.\n`;
    try {
      await sendEmail(donorEmail, subject, text);
    } catch (err) {
      logger.warn({ err, donorEmail, eventKey }, '[Payments] failed to send donation receipt email');
    }
  }

  await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'donation_granted' }, { merge: true });
  logger.info({ event: 'donation_applied', eventKey, sessionId, wishId, amount }, '[Payments] donation applied');
  return { ok: true };
}

async function handleTokenPurchaseWebhook(args: {
  tokenTransactionRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  tokenData: Record<string, any>;
  incomingStatus: string;
  eventId?: string;
  eventKey: string;
  eventsRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  updatedAtVal: any;
}): Promise<{ ok: boolean; alreadyProcessed?: boolean }> {
  const { tokenTransactionRef, tokenData, incomingStatus, eventId, eventKey, eventsRef, updatedAtVal } = args;
  const sessionId = String(tokenData.geideaSessionId || '');
  const userId = String(tokenData.userId || '');
  const tokenAmount = Number(tokenData.tokenAmount || 0);
  const currency = String(tokenData.currency || 'EGP');

  if (!userId || !(tokenAmount > 0)) {
    throw new Error('Token transaction missing userId or tokenAmount');
  }

  // Update transaction status in both Firestore and PostgreSQL
  await tokenTransactionRef.update({
    status: incomingStatus || 'UNKNOWN',
    ...(eventId ? { lastEventId: eventId } : { lastEventId: eventKey }),
    updatedAt: updatedAtVal,
  });

  // If not successful, mark as processed but do not credit tokens
  if (!(incomingStatus === 'PAID' || incomingStatus === 'SUCCESS')) {
    await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'status_update' }, { merge: true });
    logger.info({ eventKey, sessionId, userId, status: incomingStatus }, '[Payments] token purchase not successful');
    return { ok: true };
  }

  // Handle token credit with idempotency check
  const txResult = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(tokenTransactionRef);
    const data = snap.data() || {};
    const alreadyProcessed = Boolean(
      data.tokensCredited ||
      String(data.status || '').toUpperCase() === 'CREDITED' ||
      (String(data.status || '').toUpperCase() === 'SUCCESS' && data.creditedAt)
    );
    if (alreadyProcessed) {
      return { shouldCredit: false, data };
    }

    // Mark tokens as credited and credit user balance
    tx.update(tokenTransactionRef, {
      status: 'SUCCESS',
      tokensCredited: true,
      creditedAt: updatedAtVal,
      updatedAt: updatedAtVal,
    });

    const userRef = admin.firestore().collection('users').doc(userId);
    tx.update(userRef, {
      tokenBalance: admin.firestore.FieldValue.increment(tokenAmount),
    });

    return { shouldCredit: true, data };
  });

  if (!txResult.shouldCredit) {
    await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'tokens_already_credited' }, { merge: true });
    logger.info({ eventKey, sessionId, userId }, '[Payments] tokens already credited (idempotent)');
    return { ok: true, alreadyProcessed: true };
  }

  // Update PostgreSQL audit with final status
  await saveTokenTransactionRecord({
    transactionId: tokenTransactionRef.id,
    userId,
    type: 'PURCHASE',
    tokenAmount,
    amount: tokenData.amount || tokenAmount,
    currency,
    status: 'SUCCESS',
    geideaSessionId: sessionId,
    createdAt: tokenData.createdAt || new Date(),
  });

  // Send success notification
  try {
    await sendInAppNotification({
      userId,
      type: 'system',
      content: `You've successfully purchased ${tokenAmount} tokens!`,
      link: '/wallet',
    });
  } catch (err) {
    logger.warn({ err, userId, eventKey }, '[Payments] failed to send token purchase notification');
  }

  await eventsRef.set({ processed: true, processedAt: updatedAtVal, note: 'tokens_credited' }, { merge: true });
  logger.info({ event: 'token_purchase_completed', eventKey, sessionId, userId, tokenAmount }, '[Payments] token purchase completed');
  return { ok: true };
}

export async function createGeideaTokenPurchaseSession(args: {
  tokenAmount: number;
  amount: number;
  currency?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
}): Promise<{ paymentUrl: string; sessionId: string }> {
  const currency = (args.currency || 'EGP').toUpperCase();
  const amount = Number(args.amount || 0);
  if (!(amount > 0)) throw new Error('Invalid token purchase amount');

  if (USE_MOCK) {
    const sessionId = `mock_token_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${amount}&currency=${currency}&tokens=${args.tokenAmount}`;
    return { paymentUrl, sessionId };
  }

  const merchantId = process.env.GEIDEA_MERCHANT_ID;
  const apiPassword = process.env.GEIDEA_API_PASSWORD;
  const callbackUrl = process.env.GEIDEA_CALLBACK_URL;
  const baseUrl = getGeideaBaseUrl();

  if (!merchantId || !apiPassword || !callbackUrl) {
    if (ALLOW_UNCONFIGURED_PAYMENT_FALLBACK) {
      const sessionId = `mock_fallback_token_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const paymentUrl = `https://mock.local/checkout?sessionId=${sessionId}&amount=${amount}&currency=${currency}&tokens=${args.tokenAmount}`;
      logger.warn('[Payments] Geidea config missing. Using token purchase mock checkout fallback session.');
      return { paymentUrl, sessionId };
    }
    throw new Error('Geidea config missing. Set GEIDEA_MERCHANT_ID, GEIDEA_API_PASSWORD, GEIDEA_CALLBACK_URL env vars OR enable mock via USE_MOCK_PAYMENTS=1.');
  }

  const payload: Record<string, any> = {
    merchantId,
    amount: amount.toFixed(2),
    currency,
    callbackUrl,
    customer: {
      id: args.userId,
      email: args.userEmail,
      name: args.userName,
    },
    merchantReferenceId: `token_${args.tokenAmount}_${args.userId}`,
  };

  const resp = await callGateway(() => axios.post(`${baseUrl}/v2/payments`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `APIKey ${apiPassword}`,
    },
    timeout: 10000,
  }));

  const data = (resp as any).data || {};
  const paymentUrl = data.redirectUrl || data.paymentUrl;
  const sessionId = data.id || data.sessionId;
  if (!paymentUrl || !sessionId) {
    throw new Error('Unexpected gateway response (missing paymentUrl/sessionId)');
  }
  return { paymentUrl, sessionId };
}

export async function mockComplete(sessionId: string): Promise<void> {
  await handleGeideaWebhook(Buffer.from(JSON.stringify({ id: sessionId, status: 'SUCCESS' })));
}
