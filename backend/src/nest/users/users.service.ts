import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { isMembershipActive } from '../../core/membership';
import { findBannedKeywordInFields } from '../../core/moderation-utils';
import { geocodeAddress, readGeoPoint } from '../../core/geo';

export class StatusError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

@Injectable()
export class UsersService {
  private normalizeGeo(value: any): { lat: number; lng: number } | undefined {
    const geo = readGeoPoint(value);
    if (!geo) return undefined;
    if (geo.lat < -90 || geo.lat > 90) return undefined;
    if (geo.lng < -180 || geo.lng > 180) return undefined;
    return geo;
  }

  private serverTimestamp() {
    const fv: any = (admin.firestore as any)?.FieldValue;
    return fv && typeof fv.serverTimestamp === 'function' ? fv.serverTimestamp() : new Date();
  }

  private deleteField() {
    const fv: any = (admin.firestore as any)?.FieldValue;
    return fv && typeof fv.delete === 'function' ? fv.delete() : null;
  }

  private buildPublicProfile(uid: string, data: Record<string, any>) {
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

    return {
      uid,
      username: username || null,
      usernameLower: username ? usernameLower : null,
      name: data?.name || data?.fullName || data?.displayName || 'Member',
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
      updatedAt: this.serverTimestamp(),
    };
  }
  /**
   * Update user profile with KYC verification guard.
   * Throws StatusError with HTTP-like codes to allow reuse from Express.
   */
  async updateProfile(userId: string, profile: Record<string, any>): Promise<void> {
    if (!userId) {
      throw new StatusError(401, 'Unauthenticated request');
    }
    if (!profile || typeof profile !== 'object') {
      throw new StatusError(400, 'Missing profile object');
    }

    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new StatusError(404, 'User not found');
    }
    const membership = userSnap.get('membership');
    const current = userSnap.data() || {};
    const isBusinessPlan = membership?.plan === 'Business' && isMembershipActive(membership);

    const blocked = new Set(['membership', 'kyc', 'role', 'rating', 'ratingSum', 'reviewsCount']);
    const sanitized: Record<string, any> = { ...profile };
    for (const key of blocked) {
      if (key in sanitized) delete sanitized[key];
    }
    if ('businessProfile' in sanitized) {
      if (!isBusinessPlan) {
        throw new StatusError(403, 'Business plan required to update business profile');
      }
      const bp = sanitized.businessProfile || {};
      const cleaned: Record<string, any> = {};
      const name = String(bp.name || '').trim();
      const description = String(bp.description || '').trim();
      const website = String(bp.website || '').trim();
      const brandColor = String(bp.brandColor || '').trim();
      const logoUrl = String(bp.logoUrl || '').trim();
      if (name) cleaned.name = name;
      if (description) cleaned.description = description;
      if (website) cleaned.website = website;
      if (brandColor) cleaned.brandColor = brandColor;
      if (logoUrl) cleaned.logoUrl = logoUrl;
      const teamMembers = Array.isArray(bp.teamMembers)
        ? bp.teamMembers.map((item: any) => String(item || '').trim()).filter(Boolean).slice(0, 5)
        : [];
      if (teamMembers.length) cleaned.teamMembers = teamMembers;
      const customCategories = Array.isArray(bp.customCategories)
        ? bp.customCategories.map((item: any) => String(item || '').trim()).filter(Boolean).slice(0, 10)
        : [];
      if (customCategories.length) cleaned.customCategories = customCategories;
      if (Object.keys(cleaned).length > 0) {
        sanitized.businessProfile = cleaned;
      } else {
        delete sanitized.businessProfile;
      }
    }
    if (!Object.keys(sanitized).length) {
      throw new StatusError(400, 'No updatable profile fields provided');
    }
    if (sanitized.profile && typeof sanitized.profile === 'object') {
      const profileObj = { ...(sanitized.profile as Record<string, any>) };
      if (Object.prototype.hasOwnProperty.call(profileObj, 'username')) {
        const username = String(profileObj.username || '').trim();
        if (username) {
          profileObj.username = username;
          profileObj.usernameLower = username.toLowerCase();
        } else {
          delete profileObj.username;
          delete profileObj.usernameLower;
        }
      }
      if (Object.keys(profileObj).length > 0) {
        sanitized.profile = profileObj;
      } else {
        delete sanitized.profile;
      }
    }
    const banned = await findBannedKeywordInFields([
      { label: 'name', value: (sanitized as any).name },
      { label: 'bio', value: (sanitized as any).bio },
      { label: 'location', value: (sanitized as any).location },
      { label: 'country', value: (sanitized as any).country },
      { label: 'profile.username', value: (sanitized as any).profile?.username },
      { label: 'servicesOffered', value: (sanitized as any).servicesOffered },
      { label: 'servicesRequested', value: (sanitized as any).servicesRequested },
      { label: 'businessProfile.name', value: (sanitized as any).businessProfile?.name },
      { label: 'businessProfile.description', value: (sanitized as any).businessProfile?.description },
      { label: 'businessProfile.website', value: (sanitized as any).businessProfile?.website },
      { label: 'businessProfile.customCategories', value: (sanitized as any).businessProfile?.customCategories },
    ]);
    if (banned) {
      throw new StatusError(400, 'content/banned');
    }

    const geoTouched = Object.prototype.hasOwnProperty.call(sanitized, 'geo')
      || Object.prototype.hasOwnProperty.call(sanitized, 'locationGeo');
    const clientGeo = this.normalizeGeo((sanitized as any).geo || (sanitized as any).locationGeo);
    if (geoTouched && !clientGeo) {
      throw new StatusError(400, 'Invalid geo coordinates');
    }
    if (geoTouched) {
      delete (sanitized as any).locationGeo;
    }

    const locationTouched = ['location', 'city', 'country'].some((k) => Object.prototype.hasOwnProperty.call(sanitized, k));
    if (clientGeo) {
      sanitized.geo = {
        lat: clientGeo.lat,
        lng: clientGeo.lng,
        provider: 'device',
        updatedAt: this.serverTimestamp(),
      };
      if (locationTouched) {
        const city = String((sanitized as any).city ?? (current as any).city ?? '').trim();
        const country = String((sanitized as any).country ?? (current as any).country ?? '').trim();
        sanitized.locationMeta = {
          city: city || undefined,
          country: country || undefined,
          updatedAt: this.serverTimestamp(),
        };
      }
    } else if (locationTouched) {
      const city = String((sanitized as any).city ?? (current as any).city ?? '').trim();
      const country = String((sanitized as any).country ?? (current as any).country ?? '').trim();
      const location = String((sanitized as any).location ?? (current as any).location ?? '').trim();
      const query = [location, city, country].filter(Boolean).join(', ');
      const geo = query ? await geocodeAddress(query) : null;
      if (geo) {
        sanitized.geo = {
          lat: geo.point.lat,
          lng: geo.point.lng,
          provider: geo.provider,
          updatedAt: this.serverTimestamp(),
        };
        sanitized.locationMeta = {
          city: geo.city || city || undefined,
          country: geo.country || country || undefined,
          formattedAddress: geo.formattedAddress || undefined,
          placeId: geo.placeId || undefined,
          updatedAt: this.serverTimestamp(),
        };
      } else {
        const del = this.deleteField();
        if (del) {
          sanitized.geo = del;
          sanitized.locationMeta = del;
        }
      }
    }

    await userRef.set(sanitized, { merge: true });

    const updatedSnap = await userRef.get();
    if (updatedSnap.exists) {
      const publicProfile = this.buildPublicProfile(userId, updatedSnap.data() || {});
      await admin.firestore().collection('publicProfiles').doc(userId).set(publicProfile, { merge: true });
    }
  }
}
