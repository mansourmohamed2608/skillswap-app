import * as admin from 'firebase-admin';

export type KycPayload = {
  fullName: string;
  nationalId?: string;
  vendor?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  idImageUrl?: string;
  selfieUrl?: string;
  idImageBase64?: string;
  selfieBase64?: string;
};

export type KycStatus = 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED' | 'CANCELLED';

export type KycResult = {
  status: KycStatus;
  provider: string;
  referenceId?: string;
  score?: number;
  reason?: string;
  verifiedName?: string;
  url?: string;
  updatedAt?: unknown;
};

export const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export function normalizeKycStatus(value: unknown): KycStatus {
  const status = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (status === 'VERIFIED' || status === 'APPROVED') return 'VERIFIED';
  if (status === 'FAILED' || status === 'DECLINED' || status === 'REJECTED') return 'FAILED';
  if (status === 'IN_REVIEW' || status === 'REVIEW') return 'IN_REVIEW';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'CANCELLED';
  return 'PENDING';
}

export function toPublicKycResult(value: Record<string, any>): KycResult {
  const status = normalizeKycStatus(value?.status);
  return clean({
    status,
    provider: typeof value?.provider === 'string' ? value.provider : 'didit',
    referenceId: typeof value?.referenceId === 'string' ? value.referenceId : undefined,
    score: typeof value?.score === 'number' ? value.score : undefined,
    reason: status === 'FAILED' && typeof value?.reason === 'string' ? value.reason : undefined,
    verifiedName: status === 'VERIFIED' && typeof value?.verifiedName === 'string'
      ? value.verifiedName
      : undefined,
    url: typeof value?.url === 'string' ? value.url : undefined,
    updatedAt: value?.updatedAt,
  }) as KycResult;
}

export async function getKycStatus(uid: string): Promise<KycResult | null> {
  const snap = await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').get();
  return snap.exists ? toPublicKycResult(snap.data() || {}) : null;
}
