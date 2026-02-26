import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument, canCreateListing, incrementListingCount, decrementListingCount, isMembershipActive } from '../../core/membership';
import { findBannedKeywordInFields } from '../../core/moderation-utils';
import { geocodeAddress, readGeoPoint } from '../../core/geo';

@Injectable()
export class ListingsService {
  private normalizeGeo(value: any): { lat: number; lng: number } | undefined {
    const geo = readGeoPoint(value);
    if (!geo) return undefined;
    if (geo.lat < -90 || geo.lat > 90) return undefined;
    if (geo.lng < -180 || geo.lng > 180) return undefined;
    return geo;
  }

  private isListingActive(status: any): boolean {
    const normalized = String(status || 'open').toLowerCase();
    return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
  }

  private deleteField() {
    const fv: any = (admin.firestore as any)?.FieldValue;
    return fv && typeof fv.delete === 'function' ? fv.delete() : null;
  }

  async createListing(userId: string, body: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const { listing } = body || {};
    if (!listing || typeof listing !== 'object') {
      throw new BadRequestException('Missing listing object');
    }
    const banned = await findBannedKeywordInFields([
      { label: 'title', value: (listing as any).title },
      { label: 'description', value: (listing as any).description },
      { label: 'offeredService.title', value: (listing as any).offeredService?.title },
      { label: 'offeredService.description', value: (listing as any).offeredService?.description },
      { label: 'requestedService.title', value: (listing as any).requestedService?.title },
      { label: 'requestedService.description', value: (listing as any).requestedService?.description },
      { label: 'requestedProduct.name', value: (listing as any).requestedProduct?.name },
      { label: 'requestedProduct.description', value: (listing as any).requestedProduct?.description },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field, keyword: banned.keyword });
    }

    const actorSnap = await getUserDocument(userId);
    this.ensureKycVerified(actorSnap);
    const resolved = await this.resolveBusinessOwner(actorSnap);
    const ownerId = resolved.ownerId;
    const ownerSnap = resolved.ownerSnap;
    if (ownerId !== userId) {
      this.ensureKycVerified(ownerSnap);
    }
    const membership = ownerSnap.get('membership');
    const check = canCreateListing(membership);
    if (!check.allowed) {
      throw new ForbiddenException(check.reason);
    }

    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    const listingToSave: any = { ...(listing as any) };
    const clientGeo = this.normalizeGeo((listing as any)?.geo || (listing as any)?.locationGeo);
    const locationText = String((listing as any)?.location || '').trim();
    if ((Object.prototype.hasOwnProperty.call(listing as any, 'geo') || Object.prototype.hasOwnProperty.call(listing as any, 'locationGeo')) && !clientGeo) {
      throw new BadRequestException('Invalid geo coordinates');
    }
    delete listingToSave.locationGeo;
    if (clientGeo) {
      listingToSave.geo = {
        lat: clientGeo.lat,
        lng: clientGeo.lng,
        provider: 'device',
        updatedAt: createdAtVal,
      };
    } else {
      const geo = locationText ? await geocodeAddress(locationText) : null;
      if (geo) {
        listingToSave.geo = {
          lat: geo.point.lat,
          lng: geo.point.lng,
          provider: geo.provider,
          updatedAt: createdAtVal,
        };
        listingToSave.locationMeta = {
          city: geo.city || undefined,
          country: geo.country || undefined,
          formattedAddress: geo.formattedAddress || undefined,
          placeId: geo.placeId || undefined,
          updatedAt: createdAtVal,
        };
      }
    }

    const docRef = await admin
      .firestore()
      .collection('listings')
      .add({
        ...listingToSave,
        userId: ownerId,
        offeredByUserId: ownerId,
        createdByUserId: userId,
        createdAt: createdAtVal,
        postedDate: createdAtVal,
        flagged: false,
      });

    await incrementListingCount(ownerId);
    return { id: docRef.id };
  }

  async updateListing(userId: string, listingId: string, updates: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    if (!listingId) throw new BadRequestException('Missing listing id');
    if (!updates || typeof updates !== 'object') throw new BadRequestException('Missing listing updates');

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const snap = await listingRef.get();
    if (!snap.exists) throw new NotFoundException('Listing not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).userId || (data as any).offeredByUserId;
    if (!ownerId) throw new ForbiddenException('Listing missing ownerId');
    if (!(await this.isOwnerOrTeamMember(userId, ownerId))) {
      throw new ForbiddenException('Not authorized to update this listing');
    }

    const status = (data as any).status;
    if (String(status || '').toLowerCase() === 'removed') {
      throw new BadRequestException('Listing has been removed');
    }

    const actorSnap = await getUserDocument(userId);
    this.ensureKycVerified(actorSnap);
    const ownerSnap = ownerId === userId ? actorSnap : await getUserDocument(ownerId);
    if (ownerId !== userId) {
      this.ensureKycVerified(ownerSnap);
    }
    const membership = ownerSnap.get('membership');
    if (!isMembershipActive(membership)) {
      throw new ForbiddenException('Active membership required');
    }

    const { status: _status, userId: _userId, offeredByUserId: _offeredByUserId, ...safeUpdates } = updates || {};
    const banned = await findBannedKeywordInFields([
      { label: 'title', value: (safeUpdates as any).title },
      { label: 'description', value: (safeUpdates as any).description },
      { label: 'offeredService.title', value: (safeUpdates as any).offeredService?.title },
      { label: 'offeredService.description', value: (safeUpdates as any).offeredService?.description },
      { label: 'requestedService.title', value: (safeUpdates as any).requestedService?.title },
      { label: 'requestedService.description', value: (safeUpdates as any).requestedService?.description },
      { label: 'requestedProduct.name', value: (safeUpdates as any).requestedProduct?.name },
      { label: 'requestedProduct.description', value: (safeUpdates as any).requestedProduct?.description },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field, keyword: banned.keyword });
    }
    const updatedAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    const locationTouched = Object.prototype.hasOwnProperty.call(safeUpdates as any, 'location');
    const geoTouched = Object.prototype.hasOwnProperty.call(safeUpdates as any, 'geo')
      || Object.prototype.hasOwnProperty.call(safeUpdates as any, 'locationGeo');
    const clientGeo = this.normalizeGeo((safeUpdates as any).geo || (safeUpdates as any).locationGeo);
    if (geoTouched && !clientGeo) {
      throw new BadRequestException('Invalid geo coordinates');
    }
    delete (safeUpdates as any).locationGeo;

    if (clientGeo) {
      (safeUpdates as any).geo = {
        lat: clientGeo.lat,
        lng: clientGeo.lng,
        provider: 'device',
        updatedAt: updatedAtVal,
      };
    } else if (locationTouched) {
      const locationText = String((safeUpdates as any).location || '').trim();
      const geo = locationText ? await geocodeAddress(locationText) : null;
      if (geo) {
        (safeUpdates as any).geo = {
          lat: geo.point.lat,
          lng: geo.point.lng,
          provider: geo.provider,
          updatedAt: updatedAtVal,
        };
        (safeUpdates as any).locationMeta = {
          city: geo.city || undefined,
          country: geo.country || undefined,
          formattedAddress: geo.formattedAddress || undefined,
          placeId: geo.placeId || undefined,
          updatedAt: updatedAtVal,
        };
      } else {
        const del = this.deleteField();
        if (del) {
          (safeUpdates as any).geo = del;
          (safeUpdates as any).locationMeta = del;
        }
      }
    }

    await listingRef.set({ ...safeUpdates, updatedAt: updatedAtVal }, { merge: true });
    return { success: true };
  }

  async removeListing(userId: string, listingId: string) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    if (!listingId) throw new BadRequestException('Missing listing id');

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const snap = await listingRef.get();
    if (!snap.exists) throw new NotFoundException('Listing not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).userId || (data as any).offeredByUserId;
    if (!ownerId) throw new ForbiddenException('Listing missing ownerId');
    if (!(await this.isOwnerOrTeamMember(userId, ownerId))) {
      throw new ForbiddenException('Not authorized to remove this listing');
    }

    const wasActive = this.isListingActive((data as any).status);
    const actorSnap = await getUserDocument(userId);
    this.ensureKycVerified(actorSnap);
    if (ownerId !== userId) {
      const ownerSnap = await getUserDocument(ownerId);
      this.ensureKycVerified(ownerSnap);
    }
    const removedAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    await listingRef.set(
      {
        status: 'removed',
        removedAt: removedAtVal,
        removedBy: userId,
      },
      { merge: true }
    );

    if (wasActive) {
      await decrementListingCount(ownerId);
    }

    return { success: true };
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }

  private async resolveBusinessOwner(actorSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const email = String(actorSnap.get('email') || '').trim().toLowerCase();
    if (!email) {
      return { ownerId: actorSnap.id, ownerSnap: actorSnap, isTeamMember: false };
    }
    const ownerSnap = await admin.firestore()
      .collection('users')
      .where('businessProfile.teamMembers', 'array-contains', email)
      .limit(1)
      .get();
    if (ownerSnap.empty) {
      return { ownerId: actorSnap.id, ownerSnap: actorSnap, isTeamMember: false };
    }
    const ownerDoc = ownerSnap.docs[0];
    const ownerData = ownerDoc.data() || {};
    const membership = ownerData.membership;
    if (membership?.plan !== 'Business' || !isMembershipActive(membership)) {
      return { ownerId: actorSnap.id, ownerSnap: actorSnap, isTeamMember: false };
    }
    if (ownerDoc.id === actorSnap.id) {
      return { ownerId: actorSnap.id, ownerSnap: actorSnap, isTeamMember: false };
    }
    return { ownerId: ownerDoc.id, ownerSnap: ownerDoc, isTeamMember: true };
  }

  private async isOwnerOrTeamMember(userId: string, ownerId: string) {
    if (userId === ownerId) return true;
    const userSnap = await getUserDocument(userId);
    const email = String(userSnap.get('email') || '').trim().toLowerCase();
    if (!email) return false;
    const ownerSnap = await getUserDocument(ownerId);
    const team: string[] = Array.isArray(ownerSnap.get('businessProfile')?.teamMembers)
      ? ownerSnap.get('businessProfile').teamMembers
      : [];
    return team.map((m: string) => String(m || '').trim().toLowerCase()).includes(email);
  }
}
