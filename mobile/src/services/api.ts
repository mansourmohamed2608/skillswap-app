import { auth, db } from './firebase';
import { getStatusMessage } from '@/lib/errors';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
const env: Record<string, any> =
  (typeof globalThis !== 'undefined' && (globalThis as any).process?.env)
    ? ((globalThis as any).process.env as Record<string, any>)
    : {};
const getEnv = (k: string) => (extra[k] ?? env[k]);
const PROJECT_ID = getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID') as string;
const RAW_HOST = getEnv('EXPO_PUBLIC_EMULATOR_HOST') as string | undefined;
let EMU_HOST = RAW_HOST || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
if (Platform.OS === 'web' && (!RAW_HOST || RAW_HOST === '10.0.2.2')) EMU_HOST = '127.0.0.1';
const FUNCTIONS_BASE = (getEnv('EXPO_PUBLIC_FUNCTIONS_BASE') as string)
  || ((getEnv('EXPO_PUBLIC_USE_EMULATORS') === 'true' && PROJECT_ID)
      ? `http://${EMU_HOST}:5001/${PROJECT_ID}/us-central1`
      : '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SAFE_MESSAGE_MAX = 140;

function isSafeServerMessage(message: string) {
  if (!message) return false;
  if (message.length > SAFE_MESSAGE_MAX) return false;
  if (message.includes('\n') || message.includes('\r')) return false;
  if (/exception|stack|trace|at\s/i.test(message)) return false;
  return true;
}

function messageForStatus(status: number, serverMessage?: string, fallback?: string) {
  const safe = serverMessage && isSafeServerMessage(serverMessage) ? serverMessage : undefined;
  return getStatusMessage(status, safe, fallback);
}

async function toApiError(res: Response, fallback?: string) {
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }
  let serverMessage = text.trim() || undefined;
  if (serverMessage && (serverMessage.startsWith('{') || serverMessage.startsWith('['))) {
    try {
      const data = JSON.parse(serverMessage);
      if (typeof data === 'string') {
        serverMessage = data;
      } else if (Array.isArray(data)) {
        const first = data.find((item) => typeof item === 'string');
        if (first) serverMessage = first;
      } else if (data && typeof data === 'object') {
        const msg = (data as any).message ?? (data as any).error ?? (data as any).detail ?? (data as any).code;
        if (Array.isArray(msg)) serverMessage = msg.filter(Boolean).join(', ');
        else if (typeof msg === 'string') serverMessage = msg;
      }
    } catch {
      // keep raw text
    }
  }
  const message = messageForStatus(res.status, serverMessage, fallback);
  return new ApiError(res.status, message);
}

async function authedFetch(path: string, init?: RequestInit) {
  const u = auth?.currentUser;
  if (!u) throw new ApiError(401, messageForStatus(401));
  const doFetch = async (forceRefresh: boolean) => {
    const token = await u.getIdToken(forceRefresh);
    const method = (init && init.method) ? init.method : 'POST';
    const initHeaders = (init && init.headers) ? (init.headers as Record<string, string>) : {};
    const hasBody = !!(init && (init as any).body);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...initHeaders,
    };
    try {
      return await fetch(`${FUNCTIONS_BASE}${path}`, {
        ...init,
        method,
        headers,
      });
    } catch (err) {
      throw new ApiError(0, messageForStatus(0));
    }
  };
  let res = await doFetch(false);
  if (res.status === 401) res = await doFetch(true);
  return res;
}

export async function createListing(listing: any) {
  if (!FUNCTIONS_BASE) {
    throw new Error('Functions base URL is not configured. Set EXPO_PUBLIC_FUNCTIONS_BASE or provide EXPO_PUBLIC_FIREBASE_PROJECT_ID for emulator default.');
  }
  const u = auth?.currentUser;
  if (!u) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/listings/create`, {
    body: JSON.stringify({ userId: u.uid, listing })
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function createSubscriptionSession(args: {
  plan: 'Basic' | 'Standard' | 'Pro' | 'Business';
  duration: '3_months' | '6_months' | '12_months';
  currency?: string; // default EGP
}) {
  if (!FUNCTIONS_BASE) {
    throw new Error('Functions base URL is not configured.');
  }
  const res = await authedFetch(`/api/payments/create-subscription-session`, {
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { paymentUrl: string };
}

export async function mockCompletePayment(sessionId: string) {
  if (!FUNCTIONS_BASE) {
    throw new Error('Functions base URL is not configured.');
  }
  const res = await authedFetch(`/api/payments/mock-complete`, {
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function createServiceRequest(args: {
  listingId: string;
  proposedTime?: string | number | Date;
  message?: string;
}) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const body: any = { listingId: args.listingId };
  if (args.proposedTime) body.proposedTime = args.proposedTime;
  if (args.message) body.message = args.message;
  const res = await authedFetch(`/api/requests`, { body: JSON.stringify(body) });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function rescheduleRequest(requestId: string, proposedTime: string | number | Date) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/reschedule`, {
    body: JSON.stringify({ proposedTime }),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// Mobile implementation: update user profile in Firestore directly.
// Mirrors the web intent of updateUserProfile while avoiding a hard dependency
// on a specific Cloud Function route. If you later add a backend endpoint,
// we can switch this to call it when FUNCTIONS_BASE is configured.
export async function updateUserProfile(update: Record<string, any>) {
  const u = auth?.currentUser;
  if (!u) throw new ApiError(401, messageForStatus(401));
  // Prefer backend endpoint when configured to mirror web behavior
  if (FUNCTIONS_BASE) {
    const res = await authedFetch(`/api/user/profile`, {
      body: JSON.stringify({ profile: update }),
    });
    if (!res.ok) throw await toApiError(res);
    return (await res.json()) as { success: boolean };
  }
  // Fallback: write directly to Firestore
  if (!db) throw new Error('Firestore is not configured');
  await setDoc(doc(db, 'users', u.uid), update, { merge: true });
  return { success: true } as const;
}

// ---- KYC (Phase 5) ----
export async function submitKycMobile(args: { fullName: string; nationalId?: string; idFrontUrl: string; idBackUrl: string; }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/kyc/submit`, { body: JSON.stringify(args) });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { result: any };
}

export async function getKycStatusMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/kyc/status`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { result: any };
}

export async function cancelKycMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/kyc/cancel`, { body: JSON.stringify({}) });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean; status?: string };
}

// Public KYC submit (pre-signup) using base64 images and a vendor identifier
export async function submitKycPublicMobile(args: { fullName: string; vendor: string; idFrontBase64: string; idBackBase64: string; nationalId?: string; }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await fetch(`${FUNCTIONS_BASE}/api/kyc/submit-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { result: any };
}

// Finalize pre-signup KYC by binding kyc_temp/{vendor} to the authenticated user
export async function finalizeKycMobile(vendor: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/kyc/finalize`, {
    body: JSON.stringify({ vendor }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// --- Wishes (public donation) ---
export async function donateToWishPublicMobile(wishId: string, args: { amount: number; donorEmail: string; donorName?: string; anonymous?: boolean; }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await fetch(`${FUNCTIONS_BASE}/api/wishes/${encodeURIComponent(wishId)}/donate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { paymentUrl: string; sessionId: string };
}

export async function mockCompletePaymentPublicMobile(sessionId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await fetch(`${FUNCTIONS_BASE}/api/payments/mock-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function createWishMobile(args: {
  title: string;
  description: string;
  goalAmount: number;
  currency?: string;
  category?: string;
  deadline?: string;
  imageUrl?: string;
  videoUrl?: string;
}) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/wishes/create`, { body: JSON.stringify(args) });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Active membership required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

// --- Matchmaking (triads + mutual) ---
export type ListingSummary = { id: string; title?: string; category?: string };
export type Participant = { uid: string; name?: string };

export async function fetchTriadCyclesMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/matchmaking/cycles3`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as {
    cycles: Array<{
      users: [string, string, string];
      edges: Array<{ from: string; to: string; requestId: string; listingId: string; createdAt?: number }>;
      participants?: Participant[];
      perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
      type?: 'triad';
    }>;
  };
}

export async function fetchMutualPairsMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/matchmaking/mutual2`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as {
    pairs: Array<{
      users: [string, string];
      edges: Array<{ from: string; to: string; requestId: string; listingId: string; createdAt?: number }>;
      participants?: Participant[];
      perspective?: { willGet?: ListingSummary; willGive?: ListingSummary };
      type?: 'mutual';
    }>;
  };
}

export type ListingMatch = {
  myListingId: string;
  myListingTitle: string;
  theirListingId: string;
  theirListing: {
    id: string;
    title?: string;
    category?: string;
    requestedCategory?: string;
    location?: string;
    userId?: string;
  };
  participant?: { uid: string; name?: string | null; photoURL?: string | null };
};

export async function fetchListingMatchesMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/matchmaking/listing-matches`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { matches: ListingMatch[] };
}

// --------------- Admin moderation ---------------
export async function fetchFlaggedContentMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/flagged`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; type: 'listing' | 'wish' | 'review'; data: any }> };
}

export async function dismissFlaggedContentMobile(type: 'listing' | 'wish' | 'review', id: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/flagged/${encodeURIComponent(type)}/${encodeURIComponent(id)}/dismiss`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function acceptRequestMobile(requestId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/accept`, {
    body: JSON.stringify({}),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function declineRequestMobile(requestId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/decline`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function cancelRequestMobile(requestId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/cancel`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function completeRequestMobile(requestId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/complete`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function removeFlaggedContentMobile(type: 'listing' | 'wish' | 'review', id: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/flagged/${encodeURIComponent(type)}/${encodeURIComponent(id)}/remove`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function fetchModerationKeywordsMobile() {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/keywords`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

export async function addModerationKeywordMobile(keyword: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/keywords`, {
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

export async function removeModerationKeywordMobile(keyword: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/admin/keywords/remove`, {
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

// --------------- Chat ---------------
export async function sendChatMessageMobile(args: { recipientId: string; text: string }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/chat/send`, {
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { conversationId: string; messageId: string };
}

export async function markConversationReadMobile(conversationId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/chat/read`, {
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// --- Reviews (public + auth) ---
export async function fetchReviewsForListingMobile(listingId: string, limit?: number) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  if (!listingId) throw new Error('Missing listing id');
  const query = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const res = await fetch(`${FUNCTIONS_BASE}/api/reviews/listing/${encodeURIComponent(listingId)}${query}`, {
    method: 'GET',
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Array<{ id: string; reviewerName?: string; rating: number; comment: string }>;
}

export async function fetchReviewsForUserMobile(userId: string, limit?: number) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  if (!userId) throw new Error('Missing user id');
  const query = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const res = await fetch(`${FUNCTIONS_BASE}/api/reviews/user/${encodeURIComponent(userId)}${query}`, {
    method: 'GET',
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Array<{ id: string; reviewerName?: string; rating: number; comment: string }>;
}

export async function createReviewMobile(args: { listingId: string; rating: number; comment: string; reviewerName?: string }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const token = await auth?.currentUser?.getIdToken();
  const res = await fetch(`${FUNCTIONS_BASE}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string; flagged: boolean };
}

export async function submitReportMobile(args: { type: 'listing' | 'wish' | 'review' | 'user'; contentId: string; reason: string; note?: string }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/reports`, {
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function updateListingMobile(listingId: string, listing: any) {
  if (!FUNCTIONS_BASE) {
    throw new Error('Functions base URL is not configured. Set EXPO_PUBLIC_FUNCTIONS_BASE or provide EXPO_PUBLIC_FIREBASE_PROJECT_ID for emulator default.');
  }
  if (!listingId) throw new Error('Missing listing id');
  const res = await authedFetch(`/api/listings/${encodeURIComponent(listingId)}/update`, {
    body: JSON.stringify({ listing }),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function acceptMatchMobile(payload: { type: 'triad' | 'mutual'; users: string[]; edges?: Array<{ from: string; to: string; requestId: string; listingId: string }>; }) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/matchmaking/accept`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean; key: string; acceptedCount: number };
}

// ---- Events ----
export async function fetchEventsMobile(): Promise<Array<{
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  registrationsCount?: number;
  coverUrl?: string | null;
}>> {
  if (!FUNCTIONS_BASE) return [];
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/api/events`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function registerForEventMobile(eventId: string) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/events/${encodeURIComponent(eventId)}/register`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean; alreadyRegistered?: boolean };
}

export async function createEventMobile(args: {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  coverUrl?: string;
}) {
  if (!FUNCTIONS_BASE) throw new Error('Functions base URL is not configured.');
  const res = await authedFetch(`/api/events`, { body: JSON.stringify(args) });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Business plan required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

// --------------- Admin extended ---------------

export async function fetchAdminReportsMobile(limit = 50) {
  const res = await authedFetch(`/api/admin/reports?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; type: string; contentId: string; reason: string; note?: string; reporterId: string; ownerId?: string; status: string; createdAt?: any }> };
}

export async function resolveAdminReportMobile(reportId: string, action: 'dismiss' | 'remove' = 'dismiss') {
  const res = await authedFetch(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function fetchAdminUsersMobile(limit = 50) {
  const res = await authedFetch(`/api/admin/users?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { users: Array<{ id: string; email?: string; name?: string; role?: string; accountStatus?: string }> };
}

export async function updateAdminUserRoleMobile(userId: string, role: 'admin' | 'moderator' | 'user') {
  const res = await authedFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function updateAdminUserStatusMobile(userId: string, status: 'active' | 'suspended' | 'banned') {
  const res = await authedFetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function fetchAdminAuditMobile(limit = 50) {
  const res = await authedFetch(`/api/admin/audit?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; actorId: string; action: string; targetId: string; details?: any; createdAt?: any }> };
}

export async function fetchAdminAnalyticsMobile(limit = 200) {
  const res = await authedFetch(`/api/admin/analytics?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { summary: Array<{ name: string; count: number }>; items: Array<{ id: string; name: string; userId?: string; properties?: any; createdAt?: any }> };
}

export async function markNotificationsReadMobile(ids: string[]) {
  if (!ids.length) return;
  const res = await authedFetch(`/api/user/notifications/read`, {
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { updated: number };
}
