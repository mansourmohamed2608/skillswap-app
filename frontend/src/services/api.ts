import { auth } from "@/services/firebase";
import { getStatusMessage } from "@/lib/errors";

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

export function messageForStatus(status: number, serverMessage?: string, fallback?: string) {
  const safe = serverMessage && isSafeServerMessage(serverMessage) ? serverMessage : undefined;
  return getStatusMessage(status, safe, fallback);
}

export async function toApiError(res: Response, fallback?: string) {
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

function getFunctionsBase() {
  return inferFunctionsBase();
}

async function authedFetch(path: string, init?: RequestInit) {
  const u = auth?.currentUser;
  if (!u) throw new ApiError(401, messageForStatus(401));

  // First try with the current token; if the backend responds 401, force-refresh
  // and retry once. This covers cases where the token was revoked due to a
  // password/email change or a long idle period in the emulator.
  const doFetch = async (forceRefresh: boolean) => {
    const token = await u.getIdToken(forceRefresh);
    const method = (init && init.method) ? init.method : 'POST';
    const initHeaders = (init && init.headers) ? init.headers as Record<string, string> : {};
    const hasBody = !!(init && (init as any).body);
    const mergedHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...initHeaders,
    };
    try {
      const base = getFunctionsBase();
      return await fetch(`${base}${path}`, {
        ...init,
        method,
        headers: mergedHeaders,
      });
    } catch (err) {
      throw new ApiError(0, messageForStatus(0));
    }
  };

  let res = await doFetch(false);
  if (res.status === 401) {
    // Force refresh and retry once
    res = await doFetch(true);
  }
  return res;
}

export async function createSubscriptionSession(args: {
  plan: "Basic" | "Standard" | "Pro" | "Business";
  duration: "3_months" | "6_months" | "12_months";
  currency?: string; // default EGP
}) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));

  const res = await authedFetch(`/api/payments/create-subscription-session`, {
    body: JSON.stringify({ userId, ...args }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { paymentUrl: string };
}

export async function mockCompletePayment(sessionId: string) {
  const res = await authedFetch(`/api/payments/mock-complete`, {
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

export async function mockCompletePaymentPublic(sessionId: string, baseUrl?: string) {
  const root = baseUrl || getFunctionsBase();
  const res = await fetch(`${root}/api/payments/mock-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean };
}

/**
 * Update the authenticated user's profile.
 *
 * Sends a POST request to `/api/user/profile` with a `profile` object. Only the
 * fields provided in the profile object will be merged into the existing
 * Firestore user document. This endpoint requires a valid Firebase ID token
 * which is automatically included via `authedFetch`.
 *
 * @param profile An object containing the fields to update (e.g. name,
 *   location, avatarUrl, coverUrl, username, etc.)
 * @returns A promise resolving to `{ success: boolean }` on success.
 */
export async function updateUserProfile(profile: Record<string, any>) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/user/profile`, {
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function createListing(listing: any) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));

  const res = await authedFetch(`/api/listings/create`, {
    body: JSON.stringify({ userId, listing }),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function updateListing(listingId: string, listing: any) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  if (!listingId) throw new Error("Missing listing id");
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

export async function deleteListing(listingId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  if (!listingId) throw new Error("Missing listing id");
  const res = await authedFetch(`/api/listings/${encodeURIComponent(listingId)}/delete`, {
    body: JSON.stringify({}),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// ---------------- Events ----------------
export async function createEvent(args: {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  coverUrl?: string | null;
}) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/events`, {
    body: JSON.stringify(args),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Business plan required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function registerForEvent(eventId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/events/${encodeURIComponent(eventId)}/register`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean; alreadyRegistered?: boolean };
}

// Create a service exchange request (booking-like action)
export async function createServiceRequest(args: {
  listingId: string;
  proposedTime?: string | number | Date;
  message?: string;
}) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const body: any = {
    listingId: args.listingId,
  };
  if (args.proposedTime) body.proposedTime = args.proposedTime;
  if (args.message) body.message = args.message;
  const res = await authedFetch(`/api/requests`, {
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Subscription required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

// Reschedule an existing service request by updating its proposedTime
export async function rescheduleRequest(requestId: string, proposedTime: string | number | Date) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
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

export async function acceptRequest(requestId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
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

export async function declineRequest(requestId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/decline`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function cancelRequest(requestId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/cancel`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function completeRequest(requestId: string) {
  const userId = auth?.currentUser?.uid;
  if (!userId) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/requests/${encodeURIComponent(requestId)}/complete`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// ---------------- Wishes (Phase 6) ----------------
export async function createWish(args: {
  title: string;
  description: string;
  goalAmount: number;
  currency?: string;
  category?: string;
  deadline?: string;
  imageUrl?: string;
  videoUrl?: string;
}) {
  const u = auth?.currentUser;
  if (!u) throw new ApiError(401, messageForStatus(401));
  const res = await authedFetch(`/api/wishes/create`, {
    body: JSON.stringify(args),
  });
  if (res.status === 403) {
    const msg = await res.text();
    throw new ApiError(403, messageForStatus(403, msg, 'Active membership required'));
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function donateToWishPublic(baseUrl: string, wishId: string, args: { amount: number; donorEmail: string; donorName?: string; anonymous?: boolean; }) {
  const res = await fetch(`${baseUrl}/api/wishes/${encodeURIComponent(wishId)}/donate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { paymentUrl: string; sessionId: string };
}

// --------------- Matchmaking (cycles + mutual) ---------------
export type ListingSummary = { id: string; title?: string; category?: string };
export type Participant = { uid: string; name?: string };

export async function fetchTriadCycles() {
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

export async function fetchMutualPairs() {
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

export async function acceptMatch(payload: { type: 'triad' | 'mutual'; users: string[]; edges?: Array<{ from: string; to: string; requestId: string; listingId: string }>; }) {
  const res = await authedFetch(`/api/matchmaking/accept`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { ok: boolean; key: string; acceptedCount: number };
}

// --------------- Admin moderation ---------------
export async function fetchFlaggedContent() {
  const res = await authedFetch(`/api/admin/flagged`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; type: 'listing' | 'wish' | 'review'; data: any }> };
}

export async function dismissFlaggedContent(type: 'listing' | 'wish' | 'review', id: string) {
  const res = await authedFetch(`/api/admin/flagged/${encodeURIComponent(type)}/${encodeURIComponent(id)}/dismiss`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function removeFlaggedContent(type: 'listing' | 'wish' | 'review', id: string) {
  const res = await authedFetch(`/api/admin/flagged/${encodeURIComponent(type)}/${encodeURIComponent(id)}/remove`, {
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// --------------- Chat ---------------
export async function sendChatMessage(args: { recipientId: string; text: string }) {
  const res = await authedFetch(`/api/chat/send`, {
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { conversationId: string; messageId: string };
}

export async function markConversationRead(conversationId: string) {
  const res = await authedFetch(`/api/chat/read`, {
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

// --------------- Reports ---------------
export async function submitReport(args: { type: 'listing' | 'wish' | 'review'; contentId: string; reason: string; note?: string }) {
  const res = await authedFetch(`/api/reports`, {
    body: JSON.stringify(args),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { id: string };
}

export async function fetchAdminReports(limit = 50) {
  const res = await authedFetch(`/api/admin/reports?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; type: string; contentId: string; reason: string; note?: string; reporterId: string; ownerId?: string; status: string; createdAt?: any }> };
}

export async function resolveAdminReport(reportId: string, action: 'dismiss' | 'remove' = 'dismiss') {
  const res = await authedFetch(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function fetchModerationKeywords() {
  const res = await authedFetch(`/api/admin/keywords`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

export async function addModerationKeyword(keyword: string) {
  const res = await authedFetch(`/api/admin/keywords`, {
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

export async function removeModerationKeyword(keyword: string) {
  const res = await authedFetch(`/api/admin/keywords/remove`, {
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { keywords: string[] };
}

export async function fetchAdminUsers(limit = 50) {
  const res = await authedFetch(`/api/admin/users?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { users: Array<{ id: string; email?: string; name?: string; role?: string; accountStatus?: string; createdAt?: any }> };
}

export async function updateAdminUserRole(userId: string, role: 'admin' | 'moderator' | 'user') {
  const res = await authedFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function updateAdminUserStatus(userId: string, status: 'active' | 'suspended' | 'banned') {
  const res = await authedFetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { success: boolean };
}

export async function fetchAdminAudit(limit = 50) {
  const res = await authedFetch(`/api/admin/audit?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { items: Array<{ id: string; actorId: string; action: string; targetId: string; details?: any; createdAt?: any }> };
}

export async function fetchAdminAnalytics(limit = 200) {
  const res = await authedFetch(`/api/admin/analytics?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as { summary: Array<{ name: string; count: number }>; items: Array<{ id: string; name: string; userId?: string; properties?: any; createdAt?: any }> };
}

// ---------------- Reviews ----------------
export async function fetchReviewsForListing(listingId: string, limit?: number) {
  if (!listingId) throw new Error('Missing listing id');
  const query = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const base = getFunctionsBase();
  const res = await fetch(`${base}/api/reviews/listing/${encodeURIComponent(listingId)}${query}`, {
    method: 'GET',
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Array<{ id: string; reviewerName?: string; rating: number; comment: string; createdAt?: any }>;
}

export async function fetchReviewsForUser(userId: string, limit?: number) {
  if (!userId) throw new Error('Missing user id');
  const query = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const base = getFunctionsBase();
  const res = await fetch(`${base}/api/reviews/user/${encodeURIComponent(userId)}${query}`, {
    method: 'GET',
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as Array<{ id: string; reviewerName?: string; rating: number; comment: string; createdAt?: any }>;
}

export async function createReview(args: { listingId: string; rating: number; comment: string; reviewerName?: string }) {
  const token = await auth?.currentUser?.getIdToken();
  const base = getFunctionsBase();
  const res = await fetch(`${base}/api/reviews`, {
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
