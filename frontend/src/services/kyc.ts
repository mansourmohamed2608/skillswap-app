import { auth, storage } from '@/services/firebase';
import { toApiError } from '@/services/api';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const FUNCTIONS_REGION = process.env.NEXT_PUBLIC_FUNCTIONS_REGION || 'europe-west3';

function inferProjectIdFromHostedApp() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname || '';
  const m = host.match(/--([a-z0-9-]+)\.[a-z0-9-]+\.hosted\.app$/i);
  return m?.[1] || '';
}

function inferFunctionsBase() {
  if (process.env.NEXT_PUBLIC_FUNCTIONS_BASE) return process.env.NEXT_PUBLIC_FUNCTIONS_BASE;
  const inferredProjectId = PROJECT_ID || inferProjectIdFromHostedApp();
  if (!inferredProjectId) return '';
  if (typeof window === 'undefined') return `http://127.0.0.1:5001/${inferredProjectId}/us-central1`;
  const host = window.location.hostname || '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  return isLocal
    ? `http://127.0.0.1:5001/${inferredProjectId}/us-central1`
    : `https://${FUNCTIONS_REGION}-${inferredProjectId}.cloudfunctions.net`;
}

function resolveApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  const fnBase = inferFunctionsBase();
  return fnBase ? `${fnBase}/api` : '/api';
}

export async function uploadKycFile(uid: string, file: File, name: string): Promise<string> {
  if (!storage) throw new Error('Storage not initialized');
  const path = `users/${uid}/kyc/${Date.now()}_${name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return await getDownloadURL(r);
}

export async function submitKyc(params: { fullName: string; nationalId?: string; idFrontUrl: string; idBackUrl: string; }): Promise<any> {
  const base = resolveApiBase();
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
  const base = resolveApiBase();
  const resp = await fetch(`${base}/kyc/submit-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to submit verification details.');
  return await resp.json();
}

export async function fetchKycStatusByVendor(vendor: string): Promise<any> {
  const base = resolveApiBase();
  const resp = await fetch(`${base}/kyc/status?vendor=${encodeURIComponent(vendor)}`);
  if (!resp.ok) throw await toApiError(resp, 'Unable to fetch verification status.');
  return await resp.json();
}

export async function fetchKycStatus(): Promise<any> {
  const base = resolveApiBase();
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/status`, {
    method: 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to fetch verification status.');
  return await resp.json();
}

export async function cancelKyc(): Promise<any> {
  const base = resolveApiBase();
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({}),
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to cancel verification.');
  return await resp.json();
}

export async function verifyKycIdWithFiles(frontFile: File, backFile: File): Promise<any> {
  const base = resolveApiBase();
  const token = await auth?.currentUser?.getIdToken();
  const formData = new FormData();
  formData.append('front', frontFile);
  formData.append('back', backFile);
  const resp = await fetch(`${base}/kyc/id/verify`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to verify ID document.');
  return await resp.json();
}
