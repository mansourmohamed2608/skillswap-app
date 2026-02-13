import { auth, storage } from '@/services/firebase';
import { toApiError } from '@/services/api';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export async function uploadKycFile(uid: string, file: File, name: string): Promise<string> {
  if (!storage) throw new Error('Storage not initialized');
  const path = `users/${uid}/kyc/${Date.now()}_${name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return await getDownloadURL(r);
}

export async function submitKyc(params: { fullName: string; nationalId?: string; idFrontUrl: string; idBackUrl: string; }): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to submit verification details.');
  return await resp.json();
}

export async function submitKycPublic(params: { fullName: string; vendor: string; idFrontBase64: string; idBackBase64: string; nationalId?: string }): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const resp = await fetch(`${base}/kyc/submit-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to submit verification details.');
  return await resp.json();
}

export async function fetchKycStatusByVendor(vendor: string): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const resp = await fetch(`${base}/kyc/status?vendor=${encodeURIComponent(vendor)}`);
  if (!resp.ok) throw await toApiError(resp, 'Unable to fetch verification status.');
  return await resp.json();
}

export async function fetchKycStatus(): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/status`, {
    method: 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to fetch verification status.');
  return await resp.json();
}

export async function cancelKyc(): Promise<any> {
  const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({}),
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to cancel verification.');
  return await resp.json();
}
