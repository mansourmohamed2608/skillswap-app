// src/lib/analytics.ts
import { auth } from '@/services/firebase';
import { getFunctionsBase } from '@/services/api';

export async function track(name: string, properties?: Record<string, any>): Promise<void> {
  try {
    const fnBase = getFunctionsBase();
    const base = fnBase ? `${fnBase}/api` : (process.env.NEXT_PUBLIC_API_BASE || '');
    if (!base) return;
    const idToken = await auth?.currentUser?.getIdToken();
    await fetch(`${base}/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ name, properties: properties || {} }),
    });
  } catch {
    // swallow errors to avoid impacting UX
  }
}
