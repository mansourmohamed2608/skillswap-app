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
  private normalizeUsername(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private normalizePhone(value: string): string {
    const raw = String(value || '').trim();
    const normalized = raw.replace(/[^\d+]/g, '');
    if (normalized.startsWith('00')) return `+${normalized.slice(2)}`;
    return normalized;
  }

  private validateUsernameOrThrow(value: string): string {
    const username = String(value || '').trim();
    // 3-32 chars, letters/numbers plus . _ -
    if (username.length < 3 || username.length > 32) {
      throw new StatusError(400, 'Invalid username format');
    }
    if (!/^[\p{L}\p{N}._-]+$/u.test(username)) {
      throw new StatusError(400, 'Invalid username format');
    }
    return username;
  }

  private toNameSlug(name: string): string {
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

  private getCandidateProfileNames(data: Record<string, any>): string[] {
    const values = [
      data?.name,
      data?.fullName,
      data?.full_name,
      data?.displayName,
      data?.profile?.name,
      data?.profile?.fullName,
      data?.profile?.full_name,
      data?.profile?.displayName,
    ];
    return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
  }

  private normalizeSearchToken(value: string): string {
    const raw = String(value || '').trim().toLowerCase();
    return raw
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}._\-\s]+/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

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
    const name = String(data?.name || data?.fullName || data?.displayName || 'Member').trim();
    const nameSlug = this.toNameSlug(name);

    return {
      uid,
      username: username || null,
      usernameLower: username ? usernameLower : null,
      name,
      nameSlug: nameSlug || null,
      avatarUrl: String(data?.avatarUrl || '').trim(),
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
    const inputProfileObj = (profile as any)?.profile && typeof (profile as any).profile === 'object'
      ? (profile as any).profile
      : null;
    const usernameTouched = Boolean(
      inputProfileObj && Object.prototype.hasOwnProperty.call(inputProfileObj, 'username')
    );

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
      if (website) {
        try {
          const parsedWebsite = new URL(website);
          if (!['http:', 'https:'].includes(parsedWebsite.protocol)) {
            throw new StatusError(400, 'Business website must use http or https protocol');
          }
        } catch (e: any) {
          if (e instanceof StatusError) throw e;
          throw new StatusError(400, 'Invalid business website URL');
        }
        cleaned.website = website;
      }
      if (brandColor) cleaned.brandColor = brandColor;
      if (logoUrl) cleaned.logoUrl = logoUrl;
      const teamMembers = Array.isArray(bp.teamMembers)
        ? bp.teamMembers
            .map((item: any) => String(item || '').trim())
            .filter(Boolean)
            .map((item: string) => {
              if (item.length > 100) throw new StatusError(400, 'Each teamMembers entry must be 100 characters or fewer');
              return item;
            })
            .slice(0, 5)
        : [];
      if (teamMembers.length) cleaned.teamMembers = teamMembers;
      const customCategories = Array.isArray(bp.customCategories)
        ? bp.customCategories
            .map((item: any) => String(item || '').trim())
            .filter(Boolean)
            .map((item: string) => {
              if (item.length > 50) throw new StatusError(400, 'Each customCategories entry must be 50 characters or fewer');
              return item;
            })
            .slice(0, 10)
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
        const raw = String(profileObj.username || '').trim();
        const username = raw ? this.validateUsernameOrThrow(raw) : '';
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

    const currentUsernameLower = this.normalizeUsername(
      String((current as any)?.profile?.usernameLower || (current as any)?.profile?.username || '')
    );
    const nextUsernameLower = usernameTouched
      ? this.normalizeUsername(
          String((sanitized as any)?.profile?.usernameLower || (sanitized as any)?.profile?.username || '')
        )
      : currentUsernameLower;
    const usernameChanged = usernameTouched && currentUsernameLower !== nextUsernameLower;

    if (usernameChanged) {
      const idxCol = admin.firestore().collection('usernameIndex');
      await admin.firestore().runTransaction(async (tx) => {
        if (nextUsernameLower) {
          const nextRef = idxCol.doc(nextUsernameLower);
          const nextSnap = await tx.get(nextRef);
          if (nextSnap.exists) {
            const ownerUid = String(nextSnap.get('uid') || '');
            if (ownerUid && ownerUid !== userId) {
              throw new StatusError(409, 'Username is already taken');
            }
          }
          tx.set(nextRef, {
            uid: userId,
            usernameLower: nextUsernameLower,
            updatedAt: this.serverTimestamp(),
          }, { merge: true });
        }

        if (currentUsernameLower && currentUsernameLower !== nextUsernameLower) {
          tx.delete(idxCol.doc(currentUsernameLower));
        }

        tx.set(userRef, sanitized, { merge: true });
      });
    } else {
      await userRef.set(sanitized, { merge: true });
    }

    const updatedSnap = await userRef.get();
    if (updatedSnap.exists) {
      const publicProfile = this.buildPublicProfile(userId, updatedSnap.data() || {});
      await admin.firestore().collection('publicProfiles').doc(userId).set(publicProfile, { merge: true });
    }
  }

  async bootstrapAccount(userId: string, input: Record<string, any>, authEmail?: string | null): Promise<void> {
    if (!userId) {
      throw new StatusError(401, 'Unauthenticated request');
    }
    const fullName = String(input?.fullName || '').trim();
    const username = this.validateUsernameOrThrow(String(input?.username || '').trim());
    const phoneNumber = String(input?.phoneNumber || '').trim();
    const phoneNumberNormalized = this.normalizePhone(input?.phoneNumberNormalized || phoneNumber);
    const occupation = String(input?.occupation || '').trim();
    const country = String(input?.country || '').trim();
    const city = String(input?.city || '').trim();
    const email = String(authEmail || input?.email || '').trim();
    const emailLower = email.toLowerCase();

    if (!fullName || !phoneNumber || !country || phoneNumberNormalized.length < 7) {
      throw new StatusError(400, 'Missing required signup fields');
    }

    const banned = await findBannedKeywordInFields([
      { label: 'fullName', value: fullName },
      { label: 'profile.username', value: username },
    ]);
    if (banned) {
      throw new StatusError(400, 'content/banned');
    }

    const userRef = admin.firestore().collection('users').doc(userId);
    const usernameLower = this.normalizeUsername(username);
    const usernameIndexRef = admin.firestore().collection('usernameIndex').doc(usernameLower);
    const phoneIndexRef = admin.firestore().collection('phoneIndex').doc(phoneNumberNormalized);

    await admin.firestore().runTransaction(async (tx) => {
      const [userSnap, usernameSnap, phoneSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(usernameIndexRef),
        tx.get(phoneIndexRef),
      ]);

      const current = userSnap.exists ? (userSnap.data() || {}) : {};
      const currentUsernameLower = this.normalizeUsername(
        String((current as any)?.profile?.usernameLower || (current as any)?.profile?.username || '')
      );
      const currentPhoneNormalized = this.normalizePhone(
        String((current as any)?.phoneNumberNormalized || (current as any)?.phoneNumber || '')
      );

      if (usernameSnap.exists) {
        const ownerUid = String(usernameSnap.get('uid') || '');
        if (ownerUid && ownerUid !== userId) {
          throw new StatusError(409, 'Username is already taken');
        }
      }

      if (phoneSnap.exists) {
        const ownerUid = String(phoneSnap.get('uid') || '');
        if (ownerUid && ownerUid !== userId) {
          throw new StatusError(409, 'This phone number is already in use.');
        }
      }

      tx.set(usernameIndexRef, {
        uid: userId,
        usernameLower,
        updatedAt: this.serverTimestamp(),
      }, { merge: true });

      tx.set(phoneIndexRef, {
        uid: userId,
        phoneNumberNormalized,
        updatedAt: this.serverTimestamp(),
      }, { merge: true });

      if (currentUsernameLower && currentUsernameLower !== usernameLower) {
        tx.delete(admin.firestore().collection('usernameIndex').doc(currentUsernameLower));
      }
      if (currentPhoneNormalized && currentPhoneNormalized !== phoneNumberNormalized) {
        tx.delete(admin.firestore().collection('phoneIndex').doc(currentPhoneNormalized));
      }

      tx.set(userRef, {
        uid: userId,
        name: fullName,
        fullName,
        displayName: fullName,
        email: email || undefined,
        emailLower: emailLower || undefined,
        phoneNumber,
        phoneNumberNormalized,
        occupation: occupation || '',
        country,
        city: city || '',
        location: city || '',
        createdAt: userSnap.exists ? ((current as any)?.createdAt || this.serverTimestamp()) : this.serverTimestamp(),
        avatarUrl: String((current as any)?.avatarUrl || '').trim(),
        bio: String((current as any)?.bio || ''),
        rating: Number((current as any)?.rating || 0),
        reviewsCount: Number((current as any)?.reviewsCount || 0),
        servicesOffered: Array.isArray((current as any)?.servicesOffered) ? (current as any).servicesOffered : [],
        servicesRequested: Array.isArray((current as any)?.servicesRequested) ? (current as any).servicesRequested : [],
        accountStatus: String((current as any)?.accountStatus || 'active'),
        profile: {
          ...((current as any)?.profile || {}),
          username,
          usernameLower,
        },
      }, { merge: true });
    });

    const updatedSnap = await userRef.get();
    if (updatedSnap.exists) {
      const publicProfile = this.buildPublicProfile(userId, updatedSnap.data() || {});
      await admin.firestore().collection('publicProfiles').doc(userId).set(publicProfile, { merge: true });
    }
  }

  async getPublicProfileByIdentifier(identifier: string): Promise<Record<string, any> | null> {
    const raw = String(identifier || '').trim();
    if (!raw) return null;
    const usernameLower = this.normalizeUsername(raw);
    const looksLikeUid = /^[A-Za-z0-9]{20,}$/.test(raw);
    const fallbackSlugMatch = /^(.+)-([a-z0-9]{6})$/.exec(usernameLower);
    const fallbackNameSlug = fallbackSlugMatch ? fallbackSlugMatch[1] : usernameLower;
    const fallbackUidSuffix = fallbackSlugMatch ? fallbackSlugMatch[2] : '';

    // 1) Fast path for legacy uid links.
    if (looksLikeUid) {
      const byUid = await admin.firestore().collection('publicProfiles').doc(raw).get();
      if (byUid.exists) {
        const data = byUid.data() || {};
        return { uid: byUid.id, ...data };
      }
    }

    // 2) Preferred slug lookup.
    try {
      const byUsername = await admin.firestore()
        .collection('publicProfiles')
        .where('usernameLower', '==', usernameLower)
        .limit(1)
        .get();
      if (!byUsername.empty) {
        const hit = byUsername.docs[0];
        return { uid: hit.id, ...(hit.data() || {}) };
      }
    } catch {}

    // 3) Backward compatibility for old profile docs.
    try {
      const byUsernameLegacy = await admin.firestore()
        .collection('publicProfiles')
        .where('username', '==', raw)
        .limit(1)
        .get();
      if (!byUsernameLegacy.empty) {
        const hit = byUsernameLegacy.docs[0];
        return { uid: hit.id, ...(hit.data() || {}) };
      }
    } catch {}

    // 3) Fallback slug lookup from first-last name.
    try {
      const byNameSlug = await admin.firestore()
        .collection('publicProfiles')
        .where('nameSlug', '==', fallbackNameSlug)
        .limit(fallbackUidSuffix ? 20 : 1)
        .get();
      if (!byNameSlug.empty) {
        const hit = fallbackUidSuffix
          ? (byNameSlug.docs.find((d) => d.id.toLowerCase().endsWith(fallbackUidSuffix)) || byNameSlug.docs[0])
          : byNameSlug.docs[0];
        return { uid: hit.id, ...(hit.data() || {}) };
      }
    } catch {}

    // 3b) Backward compatibility for publicProfiles created before nameSlug existed.
    // Cap at 100 to prevent a DOS via unbounded collection scan; this path should
    // only trigger for very old documents that predate the nameSlug index.
    if (fallbackSlugMatch) {
      try {
        const sample = await admin.firestore()
          .collection('publicProfiles')
          .limit(100)
          .get();
        if (!sample.empty) {
          const matched = sample.docs.find((d) => {
            const data = d.data() || {};
            const uid = String((data as any)?.uid || (data as any)?.userId || (data as any)?.profile?.uid || d.id || '').toLowerCase();
            const storedSlug = String((data as any)?.nameSlug || '').trim().toLowerCase();
            if (storedSlug) {
              if (fallbackUidSuffix) {
                return storedSlug === fallbackNameSlug && uid.endsWith(fallbackUidSuffix);
              }
              return storedSlug === fallbackNameSlug;
            }
            return this.getCandidateProfileNames(data as Record<string, any>).some((name) => {
              const slug = this.toNameSlug(name);
              if (!slug) return false;
              if (fallbackUidSuffix) {
                return slug === fallbackNameSlug && uid.endsWith(fallbackUidSuffix);
              }
              return slug === fallbackNameSlug;
            });
          });
          if (matched) {
            return { uid: matched.id, ...(matched.data() || {}) };
          }
        }
      } catch {}
    }

    // 4) Fallback to users docs (covers stale/missing publicProfiles sync).
    if (looksLikeUid) {
      const userDoc = await admin.firestore().collection('users').doc(raw).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        return this.buildPublicProfile(userDoc.id, data);
      }
    }

    try {
      const byUserUsername = await admin.firestore()
        .collection('users')
        .where('profile.usernameLower', '==', usernameLower)
        .limit(1)
        .get();
      if (!byUserUsername.empty) {
        const hit = byUserUsername.docs[0];
        return this.buildPublicProfile(hit.id, hit.data() || {});
      }
    } catch {}

    try {
      const byUserUsernameLegacy = await admin.firestore()
        .collection('users')
        .where('profile.username', '==', raw)
        .limit(1)
        .get();
      if (!byUserUsernameLegacy.empty) {
        const hit = byUserUsernameLegacy.docs[0];
        return this.buildPublicProfile(hit.id, hit.data() || {});
      }
    } catch {}

    // 5) Last-resort fallback for legacy links when publicProfiles is stale/missing.
    // Cap at 100 to prevent a DOS via unbounded collection scan.
    if (fallbackSlugMatch) {
      try {
        const sample = await admin.firestore()
          .collection('users')
          .limit(100)
          .get();
        if (!sample.empty) {
          const matched = sample.docs.find((d) => {
            const data = d.data() as Record<string, any>;
            const uid = String(data?.uid || data?.userId || data?.profile?.uid || d.id || '').toLowerCase();
            return this.getCandidateProfileNames(d.data() as Record<string, any>).some((name) => {
              const slug = this.toNameSlug(name);
              if (!slug) return false;
              if (fallbackUidSuffix && uid.endsWith(fallbackUidSuffix)) {
                return slug === fallbackNameSlug || fallbackNameSlug === 'member';
              }
              if (!fallbackUidSuffix) {
                return slug === fallbackNameSlug;
              }
              return false;
            });
          });
          if (matched) {
            return this.buildPublicProfile(matched.id, matched.data() || {});
          }
        }
      } catch {}
    }

    return null;
  }

  async searchPublicProfiles(q: string, limit = 8): Promise<Array<{ uid: string; username?: string; name: string; avatarUrl?: string }>> {
    const token = this.normalizeSearchToken(q);
    if (!token || token.length < 2) return [];
    const lim = Math.min(20, Math.max(1, Number(limit) || 8));
    const usernamePrefix = this.normalizeUsername(token);
    const nameSlugPrefix = token
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 64);

    const results = new Map<string, { uid: string; username?: string; name: string; avatarUrl?: string }>();

    try {
      const [byUsername, byNameSlug] = await Promise.all([
        admin.firestore()
          .collection('publicProfiles')
          .orderBy('usernameLower')
          .startAt(usernamePrefix)
          .endAt(`${usernamePrefix}\uf8ff`)
          .limit(lim)
          .get()
          .catch(() => null),
        nameSlugPrefix
          ? admin.firestore()
              .collection('publicProfiles')
              .orderBy('nameSlug')
              .startAt(nameSlugPrefix)
              .endAt(`${nameSlugPrefix}\uf8ff`)
              .limit(lim)
              .get()
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const addSnap = (snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null) => {
        if (!snap || snap.empty) return;
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          const name = String(data?.name || '').trim();
          const username = String(data?.username || '').trim();
          if (!name && !username) return;
          if (!results.has(d.id)) {
            results.set(d.id, {
              uid: d.id,
              username: username || undefined,
              name: name || username,
              avatarUrl: String(data?.avatarUrl || '').trim() || undefined,
            });
          }
        });
      };

      addSnap(byUsername);
      addSnap(byNameSlug);
    } catch {}

    if (!results.size) {
      // Fallback to users collection for stale projects before publicProfiles sync.
      try {
        const byNested = await admin.firestore()
          .collection('users')
          .orderBy('profile.usernameLower')
          .startAt(usernamePrefix)
          .endAt(`${usernamePrefix}\uf8ff`)
          .limit(lim)
          .get()
          .catch(() => null);
        if (byNested && !byNested.empty) {
          byNested.docs.forEach((d) => {
            const data = d.data() || {};
            const name = String(data?.name || data?.fullName || data?.displayName || '').trim();
            const username = String(data?.profile?.username || data?.username || '').trim();
            if (!name && !username) return;
            if (!results.has(d.id)) {
              results.set(d.id, {
                uid: d.id,
                username: username || undefined,
                name: name || username,
                avatarUrl: String(data?.avatarUrl || '').trim() || undefined,
              });
            }
          });
        }
      } catch {}
    }

    const lowered = token.toLowerCase();
    return Array.from(results.values())
      .filter((item) => {
        const name = String(item.name || '').toLowerCase();
        const username = String(item.username || '').toLowerCase();
        return name.includes(lowered) || username.includes(lowered);
      })
      .slice(0, lim);
  }

  async isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
    const normalized = this.normalizeUsername(this.validateUsernameOrThrow(username));
    const existingIdx = await admin.firestore().collection('usernameIndex').doc(normalized).get().catch(() => null);
    if (existingIdx?.exists) {
      const ownerUid = String(existingIdx.get('uid') || '');
      if (!ownerUid || ownerUid !== String(currentUserId || '')) return false;
    }

    // Backward compatibility before usernameIndex existed.
    const [byNested, byRoot] = await Promise.all([
      admin.firestore()
        .collection('users')
        .where('profile.usernameLower', '==', normalized)
        .limit(2)
        .get()
        .catch(() => null),
      admin.firestore()
        .collection('users')
        .where('usernameLower', '==', normalized)
        .limit(2)
        .get()
        .catch(() => null),
    ]);
    const allDocs = [...(byNested?.docs || []), ...(byRoot?.docs || [])];
    const conflict = allDocs.find((d) => d.id !== String(currentUserId || ''));
    return !conflict;
  }

  async isPhoneAvailable(phone: string): Promise<boolean> {
    const exact = String(phone || '').trim();
    const normalized = this.normalizePhone(phone);
    if (!exact || normalized.length < 7) {
      throw new StatusError(400, 'Invalid phone number');
    }

    const users = admin.firestore().collection('users');
    const [byExact, byNormalized] = await Promise.all([
      users.where('phoneNumber', '==', exact).limit(1).get().catch(() => null),
      users.where('phoneNumberNormalized', '==', normalized).limit(1).get().catch(() => null),
    ]);

    return Boolean(byExact?.empty && byNormalized?.empty);
  }

  async markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
    if (!userId) {
      throw new StatusError(401, 'Unauthenticated request');
    }
    const uniqueIds = Array.isArray(ids)
      ? Array.from(new Set(ids.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 200)
      : [];
    if (!uniqueIds.length) return 0;

    const refs = uniqueIds.map((id) => admin.firestore().collection('notifications').doc(id));
    const snaps = await admin.firestore().getAll(...refs);
    const batch = admin.firestore().batch();
    let updated = 0;

    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() || {};
      if (String(data.userId || '') !== userId) continue;
      if (data.isRead === true) continue;
      batch.update(snap.ref, { isRead: true });
      updated += 1;
    }

    if (updated > 0) {
      await batch.commit();
    }
    return updated;
  }

  async blockUser(userId: string, targetUid: string): Promise<void> {
    if (!userId) throw new StatusError(401, 'Unauthenticated request');
    if (!targetUid) throw new StatusError(400, 'Missing targetUid');
    if (userId === targetUid) throw new StatusError(400, 'Cannot block yourself');
    await admin.firestore()
      .collection('users').doc(userId)
      .collection('blockedUsers').doc(targetUid)
      .set({ targetUid, blockedAt: this.serverTimestamp() }, { merge: true });
  }

  async unblockUser(userId: string, targetUid: string): Promise<void> {
    if (!userId) throw new StatusError(401, 'Unauthenticated request');
    if (!targetUid) throw new StatusError(400, 'Missing targetUid');
    await admin.firestore()
      .collection('users').doc(userId)
      .collection('blockedUsers').doc(targetUid)
      .delete();
  }

}
