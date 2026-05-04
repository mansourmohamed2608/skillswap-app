/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '@/services/firebase';
import { toApiError, getFunctionsBase } from '@/services/api';

export function getKycApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  const fnBase = getFunctionsBase();
  // Never fall back to a relative '/api' path; that would hit Next.js routes, not the backend.
  return fnBase ? `${fnBase}/api` : '';
}

export async function fetchKycStatus(): Promise<any> {
  const base = getKycApiBase();
  const token = await auth?.currentUser?.getIdToken();
  const resp = await fetch(`${base}/kyc/status`, {
    method: 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!resp.ok) throw await toApiError(resp, 'Unable to fetch verification status.');
  return await resp.json();
}

export async function cancelKyc(): Promise<any> {
  const base = getKycApiBase();
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
  const base = getKycApiBase();
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
