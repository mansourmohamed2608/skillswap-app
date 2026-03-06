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

type KycResult = {
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  provider: 'didit';
  referenceId?: string;
  score?: number;
  reason?: string;
  verifiedName?: string;
  url?: string;
};

export const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function getKycStatus(uid: string): Promise<KycResult | null> {
  const snap = await admin.firestore().collection('users').doc(uid).collection('kyc').doc('status').get();
  return (snap.exists ? (snap.data() as KycResult) : null);
}