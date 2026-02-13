
import { auth, db, isFirebaseConfigured } from './firebase';
console.log("isFirebaseConfigured in data.ts:", isFirebaseConfigured.toString());

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
    const createdAt = hit.createdAt || hit.postedDate;
    return {
        id: hit.objectID || hit.id || `${Math.random()}`,
        offeredByUserId: hit.userId || hit.offeredByUserId || 'unknown',
        offeredService: { title, description, category, imageUrl },
        requestedService: { title: requestedTitle, description: requestedDescription, category: requestedCategory },
        postedDate: toIsoOrNow(createdAt),
        status: (hit.status as ServiceListing['status']) || 'open',
        location: hit.location || '',
    };
};

async function fetchListingsFromApi(options?: { count?: number }): Promise<ServiceListing[]> {
    try {
        const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE_URL || '/api';
        const pageSize = Math.min(100, Math.max(1, options?.count ?? 50));
        const resp = await fetch(`${base}/search/listings?pageSize=${pageSize}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`api ${resp.status}`);
        const data = await resp.json();
        const hits = Array.isArray(data?.hits) ? data.hits : [];
        return hits.map(mapApiHitToListing);
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
        offeredByUserId: data.userId ?? data.offeredByUserId ?? 'unknown',
        offeredService: offered,
        requestedService: requested,
        postedDate: posted,
        status: (data.status as ServiceListing['status']) ?? 'open',
        location: data.location,
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
        return listingsSnapshot.docs.map(docToServiceListing);
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
        
        const listings = listingsSnapshot.docs.map(docToServiceListing);
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
    if (apiHit) return apiHit;

    if (!isFirebaseConfigured()) {
        console.warn(`Firebase not configured and API returned no data for id: ${id}`);
        return null;
    }
    try {
        const listingDocRef = doc(db!, 'listings', id);
        const listingDoc = await getDoc(listingDocRef);
        if (listingDoc.exists()) {
            return docToServiceListing(listingDoc);
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
    if (!id) return null;
    if (!isFirebaseConfigured() || !db) return null;
    if (!hasClientAuth()) return null;
    const isSelf = auth?.currentUser?.uid === id;
    if (isSelf) {
        try {
            const userDocRef = doc(db!, 'users', id);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                return mapUserFromDoc(userDoc.id, userDoc.data());
            }
        } catch (error) {
            console.error(`Error fetching user with id ${id}.`, error);
        }
    }
    if (!isSelf) {
        try {
            const publicRef = doc(db!, 'publicProfiles', id);
            const publicSnap = await getDoc(publicRef);
            if (publicSnap.exists()) {
                return mapUserFromDoc(publicSnap.id, publicSnap.data());
            }
        } catch (error) {
            console.warn(`Public profile read failed for user ${id}.`, error);
        }
        return null;
    }
    try {
        const publicRef = doc(db!, 'publicProfiles', id);
        const publicSnap = await getDoc(publicRef);
        if (publicSnap.exists()) {
            return mapUserFromDoc(publicSnap.id, publicSnap.data());
        }
    } catch (error) {
        console.warn(`Public profile read failed for user ${id}.`, error);
    }
    console.warn(`User with id ${id} not found in Firestore.`);
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
        const listings = allDocs
            .filter(d => (seen.has(d.id) ? false : (seen.add(d.id), true)))
            .map(docToServiceListing);
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
            deadline: data.deadline,
            imageUrl: data.imageUrl || null,
            videoUrl: data.videoUrl || null,
        } as WishSummary;
    });
}
