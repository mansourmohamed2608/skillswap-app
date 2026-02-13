// src/lib/analytics.ts
import { auth } from '@/services/firebase';

export async function track(name: string, properties?: Record<string, any>): Promise<void> {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE || '/api';
    const idToken = await auth?.currentUser?.getIdToken();
    await fetch(`${base}/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ name, properties: properties || {} }),
    });
  } catch (e) {
    // swallow errors to avoid impacting UX
  }
}
