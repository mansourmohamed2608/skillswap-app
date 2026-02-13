import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument } from '../../core/membership';
import { findBannedKeyword, findBannedKeywordInFields } from '../../core/moderation-utils';

type ReviewInput = {
  listingId: string;
  rating: number;
  comment: string;
  reviewerName?: string;
};

@Injectable()
export class ReviewsService {
  async createReview(reviewerId: string | null, payload: ReviewInput) {
    const listingId = String(payload.listingId || '').trim();
    if (!listingId) throw new BadRequestException('Missing listingId');
    const comment = String(payload.comment || '').trim();
    if (!comment) throw new BadRequestException('Missing comment');
    const ratingRaw = Number(payload.rating);
    if (!Number.isFinite(ratingRaw)) throw new BadRequestException('Invalid rating');
    const rating = Math.min(5, Math.max(1, ratingRaw));

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const listingSnap = await listingRef.get();
    if (!listingSnap.exists) throw new NotFoundException('Listing not found');
    const listingData: any = listingSnap.data() || {};
    const ownerId: string | undefined = listingData.userId || listingData.offeredByUserId;
    if (!ownerId) throw new BadRequestException('Listing missing ownerId');
    if (reviewerId && ownerId === reviewerId) {
      throw new BadRequestException({ code: 'reviews/own_listing' });
    }
    if (String(listingData.status || '').toLowerCase() === 'removed') {
      throw new BadRequestException('Listing has been removed');
    }

    let reviewerName = String(payload.reviewerName || '').trim();
    if (reviewerId) {
      const userSnap = await getUserDocument(reviewerId);
      this.ensureKycVerified(userSnap);
      const userData: any = userSnap.data() || {};
      reviewerName = reviewerName || userData.name || userData.fullName || userData.displayName || 'Member';
    }
    if (!reviewerName) reviewerName = 'Guest';
    const nameBanned = await findBannedKeywordInFields([
      { label: 'reviewerName', value: reviewerName },
    ]);
    if (nameBanned) {
      throw new BadRequestException({ code: 'content/banned', field: nameBanned.field });
    }

    const found = await findBannedKeyword(comment);
    const flagged = Boolean(found);
    const nowVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    const reviewRef = admin.firestore().collection('reviews').doc();
    await admin.firestore().runTransaction(async (tx) => {
      const freshListing = await tx.get(listingRef);
      if (!freshListing.exists) throw new NotFoundException('Listing not found');
      const freshListingData: any = freshListing.data() || {};
      const freshOwnerId: string | undefined = freshListingData.userId || freshListingData.offeredByUserId;
      if (!freshOwnerId) throw new BadRequestException('Listing missing ownerId');
      if (reviewerId && freshOwnerId === reviewerId) {
        throw new BadRequestException({ code: 'reviews/own_listing' });
      }

      const reviewDoc = {
        listingId,
        ownerId: freshOwnerId,
        reviewerId: reviewerId || null,
        reviewerName,
        rating,
        comment,
        flagged,
        flagReason: flagged ? `Contains banned keyword: ${found}` : null,
        status: flagged ? 'flagged' : 'approved',
        counted: !flagged,
        createdAt: nowVal,
        updatedAt: nowVal,
      };
      tx.set(reviewRef, reviewDoc);

      if (!flagged) {
        const listingSum = Number(freshListingData.ratingSum || 0);
        const listingCount = Number(freshListingData.reviewsCount || 0);
        const nextListingSum = listingSum + rating;
        const nextListingCount = listingCount + 1;
        const nextListingRating = Number((nextListingSum / nextListingCount).toFixed(2));
        tx.update(listingRef, {
          ratingSum: nextListingSum,
          reviewsCount: nextListingCount,
          rating: nextListingRating,
          updatedAt: nowVal,
        });

        const ownerRef = admin.firestore().collection('users').doc(freshOwnerId);
        const ownerSnap = await tx.get(ownerRef);
        if (ownerSnap.exists) {
          const ownerData: any = ownerSnap.data() || {};
          const ownerSum = Number(ownerData.ratingSum || 0);
          const ownerCount = Number(ownerData.reviewsCount || 0);
          const nextOwnerSum = ownerSum + rating;
          const nextOwnerCount = ownerCount + 1;
          const nextOwnerRating = Number((nextOwnerSum / nextOwnerCount).toFixed(2));
          tx.update(ownerRef, {
            ratingSum: nextOwnerSum,
            reviewsCount: nextOwnerCount,
            rating: nextOwnerRating,
          });
        }
      }
    });

    return { id: reviewRef.id, flagged };
  }

  async listForListing(listingId: string, limit = 50) {
    if (!listingId) throw new BadRequestException('Missing listingId');
    const snap = await admin.firestore()
      .collection('reviews')
      .where('listingId', '==', listingId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(100, Math.max(1, limit)))
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  async listForUser(userId: string, limit = 50) {
    if (!userId) throw new BadRequestException('Missing userId');
    const snap = await admin.firestore()
      .collection('reviews')
      .where('ownerId', '==', userId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(100, Math.max(1, limit)))
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
