import { db, isFirebaseConfigured } from './firebase';
import { collection, getDocs, doc, getDoc, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
import type { ServiceListing, User } from '@/types';
import { fetchPublicListingsMobile } from './api';

function docToServiceListing(d: any): ServiceListing {
  const data = d.data();
  const offered = data.offeredService ?? {
    title: data.title ?? 'Untitled',
    category: data.offeredCategory ?? data.category ?? 'General',
    description: data.description ?? '',
    imageUrl: data.imageUrl ?? data.offeredServiceImageUrl ?? undefined,
  };
  const requested = data.requestedService ?? {
    title: data.requestedServiceTitle ?? 'Any suitable exchange',
    category: data.requestedServiceCategory ?? 'General',
    description: data.requestedServiceDescription ?? '',
  };
  let posted: string;
  try {
    const ts = data.postedDate ?? data.createdAt;
    posted = ts instanceof Timestamp ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date(ts).toISOString());
  } catch {
    posted = new Date().toISOString();
  }
  return {
    id: d.id,
    offeredByUserId: data.userId ?? data.offeredByUserId ?? 'unknown',
    offeredService: offered,
    requestedService: requested,
    requestedKind: (data.requestedKind || 'service') as ServiceListing['requestedKind'],
    requestedProduct: data.requestedProduct ? {
      name: String(data.requestedProduct.name || ''),
      description: data.requestedProduct.description ? String(data.requestedProduct.description) : undefined,
    } : undefined,
    requestedMoney: data.requestedMoney ? {
      amount: Number(data.requestedMoney.amount || 0),
      currency: String(data.requestedMoney.currency || 'USD'),
    } : undefined,
    postedDate: posted,
    status: (data.status as ServiceListing['status']) ?? 'open',
    location: data.location,
    geo: (data.geo && Number.isFinite(Number(data.geo.lat)) && Number.isFinite(Number(data.geo.lng)))
      ? { lat: Number(data.geo.lat), lng: Number(data.geo.lng) }
      : undefined,
  };
}

export async function getListings(): Promise<ServiceListing[]> {
  try {
    const hits = await fetchPublicListingsMobile(50);
    return hits.map((hit: any) => docToServiceListing({
      id: String(hit.objectID || hit.id || ''),
      data: () => hit,
    }));
  } catch {
    if (!isFirebaseConfigured() || !db) return [];
    // Keep a local-emulator fallback. In deployed environments the public API
    // avoids unfiltered collection reads that cannot satisfy the removed-item rule.
    try {
      const col = collection(db, 'listings');
      const snap = await getDocs(col);
      return snap.docs
        .map(docToServiceListing)
        .filter((listing) => !['closed', 'removed', 'fulfilled', 'inactive'].includes(String(listing.status || 'open').toLowerCase()));
    } catch {
      return [];
    }
  }
}

export async function getListingById(id: string): Promise<ServiceListing | null> {
  if (!isFirebaseConfigured() || !db) return null;
  const ref = doc(db, 'listings', id);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  return docToServiceListing(d);
}

export async function getUserById(userId: string): Promise<User | null> {
  if (!isFirebaseConfigured() || !db) return null;
  // Private users/{uid} documents are owner-only. Public cards and profiles
  // must use the server-maintained public projection instead.
  const ref = doc(db, 'publicProfiles', userId);
  const d = await getDoc(ref);
  if (!d.exists()) return null;
  const data: any = d.data() || {};
  // Determine membership status and plan label
  let planLabel = data.membership?.plan || 'Free';
  const active = data.membershipActive === true;
  return {
    id: d.id,
    name: data.name || data.fullName || 'Anonymous User',
    avatarUrl: data.avatarUrl || 'https://placehold.co/128x128.png',
    coverUrl: (data.profile && data.profile.coverUrl) || data.coverUrl || undefined,
    bio: data.bio || '',
    servicesOffered: data.servicesOffered || [],
    servicesRequested: data.servicesRequested || [],
    rating: data.rating || 0,
    reviewsCount: data.reviewsCount || 0,
    location: data.location || data.city || undefined,
    country: data.country || undefined,
    membershipPlan: String(planLabel),
    membershipActive: active,
    businessProfile: data.businessProfile || undefined,
  };
}

function normalizeUsername(value: string) {
  return String(value || '').trim().toLowerCase();
}

export async function getUserByIdentifier(identifier: string): Promise<User | null> {
  const raw = String(identifier || '').trim();
  if (!raw || !isFirebaseConfigured() || !db) return null;

  const byId = await getUserById(raw);
  if (byId) return byId;

  const usernameLower = normalizeUsername(raw.replace(/^@+/, ''));
  try {
    const snap = await getDocs(query(collection(db, 'publicProfiles'), where('usernameLower', '==', usernameLower), limit(1)));
    if (!snap.empty) {
      const hit = snap.docs[0];
      return { id: hit.id, ...(hit.data() as any) } as User;
    }
  } catch {}

  try {
    const snap = await getDocs(query(collection(db, 'publicProfiles'), where('username', '==', raw.replace(/^@+/, '')), limit(1)));
    if (!snap.empty) {
      const hit = snap.docs[0];
      return { id: hit.id, ...(hit.data() as any) } as User;
    }
  } catch {}

  return null;
}

export async function getListingsWithUsers(): Promise<Array<{ listing: ServiceListing; user: any | null }>> {
  if (!isFirebaseConfigured() || !db) return [];
  const listings = await getListings();
  const results = await Promise.all(
    listings.map(async (listing) => {
      const user = await getUserById(listing.offeredByUserId);
      return { listing, user };
    })
  );
  return results;
}

export type WishSummary = {
  id: string;
  title?: string;
  description?: string;
  totalDonated?: number;
  goalAmount?: number;
  currency?: string;
  category?: string;
  imageUrl?: string | null;
};

export async function getWishes(options?: { count?: number }): Promise<WishSummary[]> {
  if (!isFirebaseConfigured() || !db) return [];
  const size = Math.min(20, Math.max(1, options?.count ?? 4));
  const q = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(size));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data: any = d.data() || {};
    return {
      id: d.id,
      title: data.title,
      description: data.description,
      totalDonated: data.totalDonated,
      goalAmount: data.goalAmount,
      currency: data.currency,
      category: data.category,
      imageUrl: data.imageUrl || null,
    } as WishSummary;
  });
}

// Fetch listings for a specific user. Mirrors the web version logic by querying
// both 'offeredByUserId' and legacy 'userId' fields, de-duplicating results.
export async function getListingsByUserId(userId: string): Promise<ServiceListing[]> {
  if (!userId) return [];
  if (!isFirebaseConfigured() || !db) return [];
  const col = collection(db, 'listings');
  const [snapOffered, snapUser] = await Promise.all([
    getDocs(query(col, where('offeredByUserId', '==', userId))),
    getDocs(query(col, where('userId', '==', userId))),
  ]);
  const seen = new Set<string>();
  const allDocs = [...snapOffered.docs, ...snapUser.docs];
  return allDocs
    .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
    .map(docToServiceListing);
}
