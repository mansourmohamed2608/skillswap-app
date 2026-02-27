import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getDb, getServerTimestamp } from './core/firebase-admin';
import { isMembershipActive } from './core/membership';

function toNameSlug(name: string): string {
  const source = String(name || '').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const firstLast = parts.slice(0, 2).join(' ');
  return firstLast
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 64);
}

function buildPublicProfile(uid: string, data: Record<string, any>) {
  const membership = data?.membership;
  const membershipPlan = membership?.plan ? String(membership.plan) : (data?.membershipPlan || 'Free');
  const membershipActive = isMembershipActive(membership) || membership?.active === true;
  const bp = data?.businessProfile || {};
  const businessProfile: Record<string, any> = {};
  const bpName = String(bp.name || '').trim();
  const bpDescription = String(bp.description || '').trim();
  const bpWebsite = String(bp.website || '').trim();
  const bpBrandColor = String(bp.brandColor || '').trim();
  const bpLogoUrl = String(bp.logoUrl || '').trim();
  if (bpName) businessProfile.name = bpName;
  if (bpDescription) businessProfile.description = bpDescription;
  if (bpWebsite) businessProfile.website = bpWebsite;
  if (bpBrandColor) businessProfile.brandColor = bpBrandColor;
  if (bpLogoUrl) businessProfile.logoUrl = bpLogoUrl;
  const username = String(data?.profile?.username || data?.username || '').trim();
  const usernameLower = String(data?.profile?.usernameLower || data?.usernameLower || username.toLowerCase()).trim().toLowerCase();
  const name = String(data?.name || data?.fullName || data?.displayName || 'Member').trim();
  const nameSlug = toNameSlug(name);

  return {
    uid,
    username: username || null,
    usernameLower: username ? usernameLower : null,
    name,
    nameSlug: nameSlug || null,
    avatarUrl: data?.avatarUrl || 'https://placehold.co/128x128.png',
    coverUrl: data?.profile?.coverUrl || data?.coverUrl || undefined,
    bio: data?.bio || '',
    servicesOffered: data?.servicesOffered || [],
    servicesRequested: data?.servicesRequested || [],
    rating: data?.rating || 0,
    reviewsCount: data?.reviewsCount || 0,
    location: data?.location || data?.city || '',
    country: data?.country || '',
    membershipPlan,
    membershipActive,
    businessProfile: Object.keys(businessProfile).length ? businessProfile : undefined,
    updatedAt: getServerTimestamp(),
  };
}

export const syncPublicProfile = onDocumentWritten('users/{uid}', async (event) => {
    const change = event.data;
    if (!change) return;
    const uid = event.params.uid as string;
    const publicRef = getDb().collection('publicProfiles').doc(uid);

    if (!change.after.exists) {
      await publicRef.delete().catch(() => {});
      return;
    }

    const data = change.after.data() || {};
    const publicProfile = buildPublicProfile(uid, data as Record<string, any>);
    await publicRef.set(publicProfile, { merge: true } as any);
  });
