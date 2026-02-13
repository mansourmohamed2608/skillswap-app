import axios from 'axios';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { extractFromDecision, compareProvidedWithExtract, sha256 as hashSha256 } from './kyc-compare';
import { withRetry } from './retry';
import { logger } from './logger';

export type KycPayload = {
  fullName: string;
  nationalId?: string;
  vendor?: string;
  diditSessionId?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  idFrontBase64?: string;
  idBackBase64?: string;
  idImageUrl?: string;
  selfieUrl?: string;
  idImageBase64?: string;
  selfieBase64?: string;
};

type KycResult = {
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  provider: 'didit';
  referenceId?: string;
  score?: number;
  reason?: string;
  verifiedName?: string;
  url?: string;
};

function getDiditConfig() {
  const apiKey = process.env.DIDIT_API_KEY;
  const baseUrl = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  const callbackUrl = process.env.DIDIT_CALLBACK_URL;
  if (!apiKey) throw new Error('Didit is not configured (DIDIT_API_KEY).');
  if (!workflowId) throw new Error('Didit workflow not configured (DIDIT_WORKFLOW_ID).');
  return { apiKey, baseUrl, workflowId, callbackUrl };
}

export const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function getKycStatus(uid: string): Promise<KycResult | null> {
  const snap = await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').get();
  return (snap.exists ? (snap.data() as KycResult) : null);
}


export async function fetchDiditDecision(sessionId: string) {
  const apiKey = process.env.DIDIT_API_KEY;
  const base = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
  if (!apiKey) throw new Error('Missing DIDIT_API_KEY');
  const resp = await withRetry(
    () => axios.get(`${base}/v2/session/${sessionId}/decision/`, {
      headers: { 'x-api-key': apiKey as string },
      timeout: 10000,
      validateStatus: () => true,
    }),
    { maxRetries: 2, operationName: 'didit_fetch_decision' }
  );
  return resp;
}

function constantTimeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return cryptoTimingSafeEqual(ab, bb);
}

function cryptoTimingSafeEqual(a: Buffer, b: Buffer): boolean {
  const crypto = require('crypto');
  return crypto.timingSafeEqual ? crypto.timingSafeEqual(a, b) : (() => {
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  })();
}

function getWebhookSecret(): string {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) throw new Error('Didit webhook secret not configured (DIDIT_WEBHOOK_SECRET).');
  return secret;
}

export async function handleDiditWebhook(rawBody: Buffer, headers: Record<string, any>): Promise<{ ok: boolean; alreadyProcessed?: boolean }> {
  if (!rawBody || !Buffer.isBuffer(rawBody)) throw new Error('Missing raw body');
  const rawText = rawBody.toString('utf8');
  const rawHash = createHash('sha256').update(rawBody).digest('hex');
  const secret = getWebhookSecret();
  const sig = String(headers['x-signature'] || headers['X-Signature'] || '');
  const ts = String(headers['x-timestamp'] || headers['X-Timestamp'] || '');
  if (!sig || !ts) throw new Error('Missing required webhook headers');
  const crypto = require('crypto');
  const tryCompute = (msg: string) => crypto.createHmac('sha256', secret).update(msg).digest('hex');
  const cand1 = tryCompute(rawText);
  const cand2 = tryCompute(`${ts}.${rawText}`);
  if (!(constantTimeEq(sig, cand1) || constantTimeEq(sig, cand2))) {
    throw new Error('Invalid webhook signature');
  }

  const evt = JSON.parse(rawText || '{}');
  const sessionId = String(evt?.session_id || evt?.sessionId || '') || '';
  const eventId = String(evt?.event_id || evt?.eventId || evt?.id || '') || '';
  const eventKey = (sessionId && eventId)
    ? `didit:${sessionId}:${eventId}`
    : rawHash;
  const eventsRef = admin.firestore().collection('kycEvents').doc(eventKey);
  const tsVal =
    (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  try {
    await eventsRef.create({
      eventKey,
      sessionId: sessionId || null,
      eventId: eventId || null,
      rawHash,
      provider: 'didit',
      receivedAt: tsVal,
    });
  } catch (e: any) {
    if (e?.code === 6 || e?.code === 'already-exists' || /already exists/i.test(String(e?.message || ''))) {
      console.info('[KYC] webhook duplicate', { eventKey, sessionId });
      return { ok: true, alreadyProcessed: true };
    }
    throw e;
  }
  console.info('[KYC] webhook received', { eventKey, sessionId, status: evt?.status });
  await admin.firestore().collection('kyc_webhooks').add(clean({
    provider: 'didit',
    headers: { 'x-signature': sig, 'x-timestamp': ts },
    event: evt,
    receivedAt: new Date(),
  }));

  let vendorData = evt?.vendor_data as string | undefined;
  const workflowId = String(evt?.workflow_id || evt?.referenceId || '') || '';
  let uid: string | undefined;
  if (vendorData && typeof vendorData === 'string' && vendorData.length >= 20) uid = vendorData;
  if (!uid && sessionId) {
    const mapDoc = await admin.firestore().collection('kycReferences').doc(sessionId).get();
    if (mapDoc.exists) {
      const m = (mapDoc.data() as any) || {};
      uid = m.uid;
      if (!uid && m.vendor) vendorData = m.vendor;
    }
  }
  if (!uid && workflowId) {
    const mapDoc = await admin.firestore().collection('kycReferences').doc(workflowId).get();
    if (mapDoc.exists) {
      const m = (mapDoc.data() as any) || {};
      uid = m.uid;
      if (!uid && m.vendor) vendorData = m.vendor;
    }
  }

  const rawStatus = String(evt?.status || '').toLowerCase();
  let status: 'PENDING' | 'VERIFIED' | 'FAILED' = 'PENDING';
  if (rawStatus.includes('verif')) status = 'VERIFIED';
  else if (rawStatus.includes('fail') || rawStatus.includes('rejected')) status = 'FAILED';
  else status = 'PENDING';

  const update: any = clean({
    status,
    provider: 'didit',
    referenceId: sessionId || workflowId || undefined,
    updatedAt: new Date(),
    reason: evt?.reason || undefined,
  });

  if (uid && uid !== '__TEMP__') {
    await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').set(update, { merge: true } as any);
    await admin.firestore().collection('users').doc(uid).set(clean({
      kyc: { status, provider: 'didit', referenceId: update.referenceId, updatedAt: new Date() },
    }), { merge: true });
  }
  if ((!uid || uid === '__TEMP__') && vendorData) {
    await admin.firestore().collection('kyc_temp').doc(String(vendorData)).set(update, { merge: true });
  }

  try {
    const decision = (evt as any)?.decision;
    const hasDecisionDetails = decision && (decision.id_verification || decision.nfc || decision.face_match || decision.liveness || Array.isArray(decision?.warnings));
    if (hasDecisionDetails) {
      const chip = decision?.nfc?.chip_data;
      const idv = decision?.id_verification;
      const docNumberPlain =
        idv?.document_number ||
        idv?.personal_number ||
        chip?.document_number ||
        undefined;

      const decisionRecord = clean({
        provider: 'didit',
        sessionId: sessionId || workflowId || undefined,
        statusRaw: decision?.status || evt?.status,
        statusMapped: status,
        features: Array.isArray(decision?.features) ? decision.features : undefined,
        idVerification: idv ? clean({
          status: idv.status,
          documentType: idv.document_type,
          documentNumberHash: hashSha256(docNumberPlain),
          issuingCountry: idv.issuing_country,
          expiresAt: idv.expiration_date || idv.expires_at,
        }) : undefined,
        nfc: chip ? clean({
          status: decision?.nfc?.status,
          firstName: chip.first_name,
          lastName: chip.last_name,
          birthDate: chip.birth_date,
          documentNumberHash: hashSha256(chip.document_number),
          issuingCountry: chip.issuing_country,
          expirationDate: chip.expiration_date,
        }) : undefined,
        scores: clean({
          face: decision?.face_match?.score,
          liveness: decision?.liveness?.score,
        }),
        warnings: Array.isArray(decision?.warnings)
          ? decision.warnings.map((w: any) => clean({
              risk: w?.risk,
              type: w?.log_type,
              short: w?.short_description,
            }))
          : undefined,
        updatedAt: new Date(),
      });

      if (uid && uid !== '__TEMP__') {
        await admin.firestore()
          .collection('users').doc(uid)
          .collection('kyc').doc('decision')
          .set(decisionRecord, { merge: true });

        try {
          const uSnap = await admin.firestore().collection('users').doc(uid).get();
          const u = (uSnap.data() || {}) as any;
          const provided = {
            fullName: u.fullName,
            dateOfBirth: u.dateOfBirth,
            nationalId: u.nationalId,
            country: u.country,
          };
          const extracted = extractFromDecision(decision);
          const cmp = compareProvidedWithExtract(provided, extracted);

          await admin.firestore()
            .collection('users').doc(uid)
            .collection('kyc').doc('decision')
            .set({
              checks: cmp.checks,
              mismatches: cmp.mismatches,
              passed: cmp.passed,
              comparedAt: new Date(),
              extracted: clean({
                fullName: extracted.fullName,
                dateOfBirth: extracted.dateOfBirth,
                documentNumberHash: extracted.documentNumberHash,
                issuingCountry: extracted.issuingCountry,
                expiresAt: extracted.expiresAt,
              }),
            }, { merge: true });

          if (status === 'VERIFIED' && !cmp.passed) {
            await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status')
              .set({ reason: 'MANUAL_REVIEW_MISMATCH' }, { merge: true });
          }
        } catch (cmpErr) {
          console.error('[KYC] compare failed', cmpErr);
        }
      } else if (vendorData) {
        await admin.firestore()
          .collection('kyc_temp').doc(String(vendorData))
          .set({ decision: decisionRecord }, { merge: true });
      }
    }
  } catch (e) {
    console.error('[KYC] decision parse/store failed', e);
  }

  return { ok: true };
}
