import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument, canCreateListing, incrementListingCount, decrementListingCount, isMembershipActive } from '../../core/membership';
import { findBannedKeywordInFields } from '../../core/moderation-utils';

@Injectable()
export class ListingsService {
  private isListingActive(status: any): boolean {
    const normalized = String(status || 'open').toLowerCase();
    return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
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
      { label: 'category', value: (listing as any).category },
      { label: 'location', value: (listing as any).location },
      { label: 'offeredService.title', value: (listing as any).offeredService?.title },
      { label: 'offeredService.description', value: (listing as any).offeredService?.description },
      { label: 'offeredService.category', value: (listing as any).offeredService?.category },
      { label: 'requestedService.title', value: (listing as any).requestedService?.title },
      { label: 'requestedService.description', value: (listing as any).requestedService?.description },
      { label: 'requestedService.category', value: (listing as any).requestedService?.category },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field });
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

    const docRef = await admin
      .firestore()
      .collection('listings')
      .add({
        ...listing,
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
      { label: 'category', value: (safeUpdates as any).category },
      { label: 'location', value: (safeUpdates as any).location },
      { label: 'offeredService.title', value: (safeUpdates as any).offeredService?.title },
      { label: 'offeredService.description', value: (safeUpdates as any).offeredService?.description },
      { label: 'offeredService.category', value: (safeUpdates as any).offeredService?.category },
      { label: 'requestedService.title', value: (safeUpdates as any).requestedService?.title },
      { label: 'requestedService.description', value: (safeUpdates as any).requestedService?.description },
      { label: 'requestedService.category', value: (safeUpdates as any).requestedService?.category },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field });
    }
    const updatedAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

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
