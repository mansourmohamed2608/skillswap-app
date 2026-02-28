
import { auth, db, isFirebaseConfigured } from './firebase';
import { getFunctionsBase } from './api';

import { collection, getDocs, doc, getDoc, query, where, DocumentData, Timestamp, limit, orderBy } from 'firebase/firestore';
import type { ServiceListing, User } from '@/types';

const mapUserFromDoc = (id: string, data: any): User => {
    const membership = data?.membership;
    let membershipPlan = data?.membershipPlan || 'Free';
    let membershipActive = typeof data?.membershipActive === 'boolean' ? data.membershipActive : false;
    if (membership) {
        membershipPlan = membership.plan ? String(membership.plan) : membershipPlan;
        if (typeof membership.active === 'boolean') {
            membershipActive = membership.active;
        } else if (membership.endDate) {
            try {
                const end = membership.endDate instanceof Timestamp
                    ? membership.endDate.toDate()
                    : new Date(membership.endDate);
                membershipActive = end.getTime() > Date.now();
            } catch {}
        }
    }

    return {
        id,
        username: String(data?.username || data?.profile?.username || '').trim() || undefined,
        name: data?.name || data?.fullName || data?.displayName || 'Anonymous User',
        avatarUrl: data?.avatarUrl || 'https://placehold.co/128x128.png',
        coverUrl: (data?.profile && data.profile.coverUrl) || data?.coverUrl || undefined,
        bio: data?.bio || `A member of the SkillSwap community.`,
        servicesOffered: data?.servicesOffered || [],
        servicesRequested: data?.servicesRequested || [],
        rating: data?.rating || 0,
        reviewsCount: data?.reviewsCount || 0,
        location: data?.location || data?.city || 'Unknown Location',
        country: data?.country || 'Unknown Country',
        membershipPlan,
        membershipActive,
        businessProfile: data?.businessProfile || undefined,
        kyc: data?.kyc || undefined,
    };
};

const hasClientAuth = () => typeof window !== 'undefined' && !!auth?.currentUser;

const isLowQualityListing = (listing: ServiceListing) => {
    const title = String(listing?.offeredService?.title || '').trim();
    const description = String(listing?.offeredService?.description || '').trim();
    if (title.length < 2 || description.length < 4) return true;
    if (/([*#@!$%^&_=+~`|\\/.-])\1{2,}/.test(title) || /([*#@!$%^&_=+~`|\\/.-])\1{2,}/.test(description)) {
        return true;
    }
    const letters = (title.match(/\p{L}/gu) || []).length + (description.match(/\p{L}/gu) || []).length;
    return letters < 4;
};

async function getUserByIdentifierFromApi(identifier: string): Promise<User | null> {
    const key = String(identifier || '').trim();
    if (!key) return null;
    try {
        const base = getFunctionsBase();
        if (!base) return null;
        const res = await fetch(`${base}/api/user/public/${encodeURIComponent(key)}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;
        const data: any = await res.json().catch(() => null);
        if (!data || typeof data !== 'object') return null;
        const uid = String(data.uid || data.id || '').trim();
        if (!uid) return null;
        return mapUserFromDoc(uid, data);
    } catch {
        return null;
    }
}

// Fallback-safe date normalizer for heterogeneous Firestore/API shapes
const toIsoOrNow = (input: any): string => {
    try {
        if (!input) throw new Error('no date');
        // Firestore Timestamp (client/admin) already has toDate()
        if (typeof input?.toDate === 'function') {
            return input.toDate().toISOString();
        }
        // Firestore serialized timestamps {_seconds,_nanoseconds} or {seconds,nanoseconds}
        if (typeof input === 'object' && input !== null) {
            const sec = input._seconds ?? input.seconds;
            const nano = input._nanoseconds ?? input.nanoseconds;
            if (typeof sec === 'number') {
                const ms = sec * 1000 + Math.floor((nano || 0) / 1e6);
                const d = new Date(ms);
                if (!Number.isNaN(d.getTime())) return d.toISOString();
            }
        }
        if (typeof input === 'string') {
            const d = new Date(input);
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        } else {
            const d = new Date(input);
            if (!Number.isNaN(d.getTime())) return d.toISOString();
        }
    } catch {}
    return new Date().toISOString();
};

const mapApiHitToListing = (hit: any): ServiceListing => {
    const title = hit.title || hit.offeredService?.title || '';
    const description = hit.description || hit.offeredService?.description || '';
    const category = hit.category || hit.offeredService?.category || '';
    const imageUrl = hit.imageUrl || hit.offeredService?.imageUrl || hit.coverUrl || undefined;
    const requestedTitle = hit.requestedService?.title || '';
    const requestedCategory = hit.requestedService?.category || '';
    const requestedDescription = hit.requestedService?.description || '';
    const requestedKind = (hit.requestedKind || 'service') as ServiceListing['requestedKind'];
    const requestedProduct = hit.requestedProduct && typeof hit.requestedProduct === 'object'
        ? {
            name: String(hit.requestedProduct.name || ''),
            description: hit.requestedProduct.description ? String(hit.requestedProduct.description) : undefined,
        }
        : hit.requestedProductName
            ? { name: String(hit.requestedProductName), description: undefined }
        : undefined;
    const requestedMoney = hit.requestedMoney && typeof hit.requestedMoney === 'object'
        ? {
            amount: Number(hit.requestedMoney.amount || 0),
            currency: String(hit.requestedMoney.currency || 'USD'),
        }
        : hit.requestedMoneyAmount !== undefined && hit.requestedMoneyAmount !== null
            ? { amount: Number(hit.requestedMoneyAmount || 0), currency: String(hit.requestedMoneyCurrency || 'USD') }
        : undefined;
    const createdAt = hit.createdAt || hit.postedDate;
    return {
        id: hit.objectID || hit.id || `${Math.random()}`,
        publicId: hit.publicId ? String(hit.publicId) : undefined,
        offeredByUserId: hit.userId || hit.offeredByUserId || 'unknown',
        offeredService: { title, description, category, imageUrl },
        requestedService: { title: requestedTitle, description: requestedDescription, category: requestedCategory },
        requestedKind,
        requestedProduct,
        requestedMoney,
        postedDate: toIsoOrNow(createdAt),
        status: (hit.status as ServiceListing['status']) || 'open',
        location: hit.location || '',
        geo: (hit.geo && Number.isFinite(Number(hit.geo.lat)) && Number.isFinite(Number(hit.geo.lng)))
            ? { lat: Number(hit.geo.lat), lng: Number(hit.geo.lng) }
            : undefined,
    };
};

async function fetchListingsFromApi(options?: { count?: number }): Promise<ServiceListing[]> {
    try {
        const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE_URL || '/api';
        const pageSize = Math.min(200, Math.max(1, options?.count ?? 200));
        const resp = await fetch(`${base}/search/listings?pageSize=${pageSize}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`api ${resp.status}`);
        const data = await resp.json();
        const hits: any[] = Array.isArray(data?.hits) ? data.hits : [];
        const listings: ServiceListing[] = hits.map(mapApiHitToListing);
        return listings.filter((listing: ServiceListing) => !isLowQualityListing(listing));
    } catch (e) {
        console.warn('fetchListingsFromApi failed, falling back to Firestore', e);
        return [];
    }
}

// Helper to convert Firestore doc to ServiceListing
function docToServiceListing(doc: DocumentData): ServiceListing {
    const data = doc.data();
    // Normalize shapes: accept either nested structure or legacy flat fields.
    const offered = data.offeredService ?? {
        title: data.title ?? '',
        category: data.offeredCategory ?? data.category ?? '',
        description: data.description ?? '',
        imageUrl: data.imageUrl ?? data.offeredServiceImageUrl ?? undefined,
    };
    const requested = data.requestedService ?? {
        title: data.requestedServiceTitle ?? '',
        category: data.requestedServiceCategory ?? '',
        description: data.requestedServiceDescription ?? '',
    };
    // Prefer postedDate; fall back to createdAt; as last resort, now
    const ts = data.postedDate ?? data.createdAt;
    const posted = ts instanceof Timestamp ? ts.toDate().toISOString() : toIsoOrNow(ts);
    return {
        id: doc.id,
        publicId: data.publicId ? String(data.publicId) : undefined,
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

// Fetch all service listings.
export async function getListings(): Promise<ServiceListing[]> {
    // 1) Try the backend API (works even when client Firebase isn't configured)
    const apiListings = await fetchListingsFromApi();
    if (apiListings.length) return apiListings;

    if (!isFirebaseConfigured()) {
        console.warn("Firebase not configured and API returned no data; returning empty list.");
        return [];
    }
    try {
        const listingsCol = collection(db!, 'listings');
        const listingsSnapshot = await getDocs(listingsCol);
        if (listingsSnapshot.empty) return [];
        const listings: ServiceListing[] = listingsSnapshot.docs.map(docToServiceListing);
        return listings.filter((listing: ServiceListing) => !isLowQualityListing(listing));
    } catch (error) {
        console.error("Error fetching listings: ", error);
        return [];
    }
}

// Fetch listings with their user data.
export async function getListingsWithUsers(options?: { count?: number }): Promise<{listing: ServiceListing, user: User | null}[]> {
    const canLoadUsers = hasClientAuth();

    // 1) Prefer backend API (avoids client Firebase config / rules issues)
    const apiListings = await fetchListingsFromApi(options);
    if (apiListings.length) {
        if (!canLoadUsers) {
            return apiListings.map((listing) => ({ listing, user: null }));
        }
        const listingsWithUsers = await Promise.all(apiListings.map(async (listing) => {
            const user = await getUserById(listing.offeredByUserId);
            return { listing, user };
        }));
        return listingsWithUsers;
    }
    
    if (!isFirebaseConfigured()) {
        console.warn("Firebase not configured and API returned no data; returning empty list.");
        return [];
    }

    try {
        const listingsCol = collection(db!, 'listings');
        const q = options?.count ? query(listingsCol, limit(options.count)) : query(listingsCol);
        const listingsSnapshot = await getDocs(q);

        if (listingsSnapshot.empty) return [];
        
        const listings: ServiceListing[] = listingsSnapshot.docs
            .map(docToServiceListing)
            .filter((listing: ServiceListing) => !isLowQualityListing(listing));
        if (!canLoadUsers) {
            return listings.map((listing) => ({ listing, user: null }));
        }
        const listingsWithUsers = await Promise.all(
            listings.map(async (listing) => {
                const user = await getUserById(listing.offeredByUserId);
                return { listing, user };
            })
        );
        return listingsWithUsers;
    } catch (error) {
        console.error("Error fetching listings with users: ", error);
        return [];
    }
}

// Fetch a single listing by ID.
export async function getListingById(id: string): Promise<ServiceListing | null> {
    // Try API (works with admin access even when client Firestore is blocked by rules/emulator auth)
    const apiListings = await fetchListingsFromApi({ count: 200 });
    const apiHit = apiListings.find(l => l.id === id);
    if (apiHit && !isLowQualityListing(apiHit)) return apiHit;

    if (!isFirebaseConfigured()) {
        console.warn(`Firebase not configured and API returned no data for id: ${id}`);
        return null;
    }
    try {
        const listingDocRef = doc(db!, 'listings', id);
        const listingDoc = await getDoc(listingDocRef);
        if (listingDoc.exists()) {
            const listing = docToServiceListing(listingDoc);
            return isLowQualityListing(listing) ? null : listing;
        }
        console.warn(`Listing with id ${id} not found in Firestore.`);
        return null;
    } catch (error) {
        console.error(`Error fetching listing with id ${id}: `, error);
        return null;
    }
}

// Fetch user by ID. Returns null on any error or misconfiguration.
export async function getUserById(id: string): Promise<User | null> {
    const uid = String(id || '').trim();
    if (!uid) return null;
    if (!isFirebaseConfigured() || !db) {
        return await getUserByIdentifierFromApi(uid);
    }

    const viewerUid = auth?.currentUser?.uid || null;
    const isSelf = viewerUid === uid;

    // 1) Public profile (works for both self and others when available).
    try {
        const publicRef = doc(db!, 'publicProfiles', uid);
        const publicSnap = await getDoc(publicRef);
        if (publicSnap.exists()) {
            return mapUserFromDoc(publicSnap.id, publicSnap.data());
        }
    } catch (error) {
        console.warn(`Public profile read failed for user ${uid}.`, error);
    }

    // 2) Private users/{uid} fallback is only valid for the signed-in user.
    if (isSelf) {
        try {
            const userDocRef = doc(db!, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                return mapUserFromDoc(userDoc.id, userDoc.data());
            }
        } catch (error) {
            console.error(`Error fetching self user with id ${uid}.`, error);
        }
    }

    console.warn(`User with id ${uid} not found in Firestore.`);
    return await getUserByIdentifierFromApi(uid);
}

function normalizeUsername(value: string): string {
    return String(value || '').trim().toLowerCase();
}

async function getUserByUsername(username: string): Promise<User | null> {
    const candidate = String(username || '').trim();
    if (!candidate || !isFirebaseConfigured() || !db) return null;
    const usernameLower = normalizeUsername(candidate);

    // 1) Preferred lookup path: indexed lowercase username in publicProfiles.
    try {
        const snap = await getDocs(
            query(collection(db!, 'publicProfiles'), where('usernameLower', '==', usernameLower), limit(1))
        );
        if (!snap.empty) {
            const hit = snap.docs[0];
            return mapUserFromDoc(hit.id, hit.data());
        }
    } catch (error) {
        console.warn(`Username lookup failed on publicProfiles.usernameLower for "${candidate}".`, error);
    }

    // 2) Backward compatibility for older docs that only stored username.
    try {
        const snap = await getDocs(
            query(collection(db!, 'publicProfiles'), where('username', '==', candidate), limit(1))
        );
        if (!snap.empty) {
            const hit = snap.docs[0];
            return mapUserFromDoc(hit.id, hit.data());
        }
    } catch (error) {
        console.warn(`Username lookup failed on publicProfiles.username for "${candidate}".`, error);
    }

    // 3) Final fallback to backend public resolver to avoid relying on private users rules.
    return await getUserByIdentifierFromApi(candidate);
}

export async function getUserByIdentifier(identifier: string): Promise<User | null> {
    const raw = String(identifier || '').trim();
    if (!raw) return null;

    // Prefer backend resolver to avoid client Firestore-rule related misses.
    const byApi = await getUserByIdentifierFromApi(raw);
    if (byApi) return byApi;

    const memberSuffixMatch = /^member-([a-z0-9]{6})$/i.exec(raw);
    if (memberSuffixMatch && isFirebaseConfigured() && db) {
        try {
            const snap = await getDocs(query(collection(db!, 'publicProfiles'), limit(2000)));
            const hit = snap.docs.find((doc) => String(doc.id || '').toLowerCase().endsWith(memberSuffixMatch[1].toLowerCase()));
            if (hit) return mapUserFromDoc(hit.id, hit.data());
        } catch {}
    }

    // Keep old UID links working.
    const looksLikeUid = /^[A-Za-z0-9]{20,}$/.test(raw);
    if (looksLikeUid) {
        const byId = await getUserById(raw);
        if (byId) return byId;
    }

    const byUsername = await getUserByUsername(raw);
    if (byUsername) return byUsername;

    // In case a custom non-standard id is used, fallback to direct lookup.
    if (!looksLikeUid) {
        return await getUserById(raw);
    }
    return null;
}

// Fetch listings for a specific user.
export async function getListingsByUserId(userId: string): Promise<ServiceListing[]> {
    if (!userId) return [];
    if (!isFirebaseConfigured()) {
        console.warn(`Firebase not configured; returning empty list for user: ${userId}`);
        return [];
    }
    try {
        const listingsCol = collection(db!, 'listings');
        // Query documents written by the newer backend (userId) and older shape (offeredByUserId)
        const [snapOffered, snapUser] = await Promise.all([
            getDocs(query(listingsCol, where("offeredByUserId", "==", userId))),
            getDocs(query(listingsCol, where("userId", "==", userId))),
        ]);
        const allDocs = [...snapOffered.docs, ...snapUser.docs];
        // De-duplicate by doc id
        const seen = new Set<string>();
        const listings: ServiceListing[] = allDocs
            .filter(d => (seen.has(d.id) ? false : (seen.add(d.id), true)))
            .map(docToServiceListing)
            .filter((listing: ServiceListing) => !isLowQualityListing(listing));
        // Note: We are now allowing an empty array to be returned from Firestore
        // If a user has no real listings, it should show that, not sample data.
        return listings;
    } catch (error) {
        console.error(`Error fetching listings for user ${userId}: `, error);
        return [];
    }
}

export type WishSummary = {
    id: string;
    publicId?: string | null;
    userId?: string;
    title?: string;
    description?: string;
    totalDonated?: number;
    goalAmount?: number;
    currency?: string;
    category?: string;
    deadline?: any;
    imageUrl?: string | null;
    videoUrl?: string | null;
};

export async function getFeaturedWishes(options?: { count?: number }): Promise<WishSummary[]> {
    if (!isFirebaseConfigured() || !db) return [];
    try {
        const size = Math.min(20, Math.max(1, options?.count ?? 4));
        const q = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(size));
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
            const data: any = d.data() || {};
            return {
                id: d.id,
                publicId: data.publicId || null,
                userId: data.userId || undefined,
                title: data.title,
                description: data.description,
                totalDonated: data.totalDonated,
                goalAmount: data.goalAmount,
                currency: data.currency,
                category: data.category,
                deadline: data.deadline,
                imageUrl: data.imageUrl || null,
                videoUrl: data.videoUrl || null,
            } as WishSummary;
        });
    } catch (error) {
        console.error("Error fetching featured wishes:", error);
        return [];
    }
}
