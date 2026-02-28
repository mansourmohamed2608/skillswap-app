import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
  private safeNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private toMillis(value: any): number {
    try {
      if (!value) return 0;
      if (typeof value?.toDate === 'function') {
        const d = value.toDate();
        return Number.isFinite(d?.getTime?.()) ? d.getTime() : 0;
      }
      const d = new Date(value);
      return Number.isFinite(d.getTime()) ? d.getTime() : 0;
    } catch {
      return 0;
    }
  }

  private applyCounts(tx: FirebaseFirestore.Transaction, refs: { listingRef: FirebaseFirestore.DocumentReference; ownerRef: FirebaseFirestore.DocumentReference; publicOwnerRef: FirebaseFirestore.DocumentReference }, currentOwnerData: any, currentListingData: any, deltaRating: number, deltaCount: number, nowVal: any) {
    const listingSum = this.safeNumber(currentListingData.ratingSum, 0);
    const listingCount = this.safeNumber(currentListingData.reviewsCount, 0);
    const nextListingSum = Math.max(0, listingSum + deltaRating);
    const nextListingCount = Math.max(0, listingCount + deltaCount);
    const nextListingRating = nextListingCount > 0 ? Number((nextListingSum / nextListingCount).toFixed(2)) : 0;
    tx.update(refs.listingRef, {
      ratingSum: nextListingSum,
      reviewsCount: nextListingCount,
      rating: nextListingRating,
      updatedAt: nowVal,
    });

    const ownerSum = this.safeNumber(currentOwnerData.ratingSum, 0);
    const ownerCount = this.safeNumber(currentOwnerData.reviewsCount, 0);
    const nextOwnerSum = Math.max(0, ownerSum + deltaRating);
    const nextOwnerCount = Math.max(0, ownerCount + deltaCount);
    const nextOwnerRating = nextOwnerCount > 0 ? Number((nextOwnerSum / nextOwnerCount).toFixed(2)) : 0;
    tx.set(refs.ownerRef, {
      ratingSum: nextOwnerSum,
      reviewsCount: nextOwnerCount,
      rating: nextOwnerRating,
    }, { merge: true });
    tx.set(refs.publicOwnerRef, {
      ratingSum: nextOwnerSum,
      reviewsCount: nextOwnerCount,
      rating: nextOwnerRating,
      updatedAt: nowVal,
    }, { merge: true });
  }

  async createReview(reviewerId: string | null, payload: ReviewInput) {
    try {
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
        let userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
        try {
          userSnap = await getUserDocument(reviewerId);
        } catch {
          // Keep this as a controlled client error instead of bubbling as 500.
          throw new ForbiddenException('Complete your profile before posting a review');
        }
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

        const ownerRef = admin.firestore().collection('users').doc(freshOwnerId);
        const publicOwnerRef = admin.firestore().collection('publicProfiles').doc(freshOwnerId);
        const ownerSnap = await tx.get(ownerRef);
        const publicOwnerSnap = await tx.get(publicOwnerRef);

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
          const listingSum = this.safeNumber(freshListingData.ratingSum, 0);
          const listingCount = this.safeNumber(freshListingData.reviewsCount, 0);
          const nextListingSum = listingSum + rating;
          const nextListingCount = listingCount + 1;
          const nextListingRating = Number((nextListingSum / nextListingCount).toFixed(2));
          tx.update(listingRef, {
            ratingSum: nextListingSum,
            reviewsCount: nextListingCount,
            rating: nextListingRating,
            updatedAt: nowVal,
          });

          const currentOwnerData: any = ownerSnap.exists ? (ownerSnap.data() || {}) : (publicOwnerSnap.exists ? (publicOwnerSnap.data() || {}) : {});
          const ownerSum = this.safeNumber(currentOwnerData.ratingSum, 0);
          const ownerCount = this.safeNumber(currentOwnerData.reviewsCount, 0);
          const nextOwnerSum = ownerSum + rating;
          const nextOwnerCount = ownerCount + 1;
          const nextOwnerRating = Number((nextOwnerSum / nextOwnerCount).toFixed(2));
          if (ownerSnap.exists) {
            tx.update(ownerRef, {
              ratingSum: nextOwnerSum,
              reviewsCount: nextOwnerCount,
              rating: nextOwnerRating,
            });
          }
          if (publicOwnerSnap.exists) {
            tx.update(publicOwnerRef, {
              ratingSum: nextOwnerSum,
              reviewsCount: nextOwnerCount,
              rating: nextOwnerRating,
              updatedAt: nowVal,
            });
          }
        }
      });

      return { id: reviewRef.id, flagged };
    } catch (error: any) {
      if (error instanceof HttpException || typeof error?.getStatus === 'function') throw error;
      console.error('[Reviews] createReview failed', {
        reviewerId,
        listingId: String(payload?.listingId || ''),
        message: String(error?.message || error),
      });
      throw new ServiceUnavailableException('Unable to create review right now');
    }
  }

  async updateReview(reviewerId: string | null, reviewId: string, payload: { rating?: number; comment?: string }) {
    try {
      if (!reviewerId) throw new ForbiddenException('Please sign in to continue');
      const comment = String(payload.comment || '').trim();
      if (!comment) throw new BadRequestException('Missing comment');
      const ratingRaw = Number(payload.rating);
      if (!Number.isFinite(ratingRaw)) throw new BadRequestException('Invalid rating');
      const rating = Math.min(5, Math.max(1, ratingRaw));

      const found = await findBannedKeyword(comment);
      if (found) {
        throw new BadRequestException({ code: 'content/banned', field: 'comment', keyword: found });
      }

      const reviewRef = admin.firestore().collection('reviews').doc(reviewId);
      const nowVal =
        (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
          ? (admin.firestore.FieldValue as any).serverTimestamp()
          : new Date();

      await admin.firestore().runTransaction(async (tx) => {
        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) throw new NotFoundException('Review not found');
        const reviewData: any = reviewSnap.data() || {};
        if (String(reviewData.reviewerId || '') !== reviewerId) {
          throw new ForbiddenException('Not authorized to update this review');
        }
        if (String(reviewData.status || '').toLowerCase() !== 'approved') {
          throw new BadRequestException('Review cannot be edited right now');
        }

        const listingId = String(reviewData.listingId || '');
        const ownerId = String(reviewData.ownerId || '');
        if (!listingId || !ownerId) throw new BadRequestException('Review is missing owner data');

        const listingRef = admin.firestore().collection('listings').doc(listingId);
        const ownerRef = admin.firestore().collection('users').doc(ownerId);
        const publicOwnerRef = admin.firestore().collection('publicProfiles').doc(ownerId);
        const [listingSnap, ownerSnap, publicOwnerSnap] = await Promise.all([
          tx.get(listingRef),
          tx.get(ownerRef),
          tx.get(publicOwnerRef),
        ]);
        if (!listingSnap.exists) throw new NotFoundException('Listing not found');

        const oldRating = this.safeNumber(reviewData.rating, 0);
        const deltaRating = rating - oldRating;
        const currentOwnerData: any = ownerSnap.exists ? (ownerSnap.data() || {}) : (publicOwnerSnap.exists ? (publicOwnerSnap.data() || {}) : {});

        tx.update(reviewRef, {
          rating,
          comment,
          updatedAt: nowVal,
        });

        if (deltaRating !== 0) {
          this.applyCounts(tx, { listingRef, ownerRef, publicOwnerRef }, currentOwnerData, listingSnap.data() || {}, deltaRating, 0, nowVal);
        }
      });

      return { success: true };
    } catch (error: any) {
      if (error instanceof HttpException || typeof error?.getStatus === 'function') throw error;
      console.error('[Reviews] updateReview failed', {
        reviewerId,
        reviewId,
        message: String(error?.message || error),
      });
      throw new ServiceUnavailableException('Unable to update review right now');
    }
  }

  async deleteReview(reviewerId: string | null, reviewId: string) {
    try {
      if (!reviewerId) throw new ForbiddenException('Please sign in to continue');
      const reviewRef = admin.firestore().collection('reviews').doc(reviewId);
      const nowVal =
        (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
          ? (admin.firestore.FieldValue as any).serverTimestamp()
          : new Date();

      await admin.firestore().runTransaction(async (tx) => {
        const reviewSnap = await tx.get(reviewRef);
        if (!reviewSnap.exists) throw new NotFoundException('Review not found');
        const reviewData: any = reviewSnap.data() || {};
        if (String(reviewData.reviewerId || '') !== reviewerId) {
          throw new ForbiddenException('Not authorized to delete this review');
        }
        if (String(reviewData.status || '').toLowerCase() !== 'approved') {
          throw new BadRequestException('Review cannot be deleted right now');
        }

        const listingId = String(reviewData.listingId || '');
        const ownerId = String(reviewData.ownerId || '');
        const rating = this.safeNumber(reviewData.rating, 0);
        if (!listingId || !ownerId) throw new BadRequestException('Review is missing owner data');

        const listingRef = admin.firestore().collection('listings').doc(listingId);
        const ownerRef = admin.firestore().collection('users').doc(ownerId);
        const publicOwnerRef = admin.firestore().collection('publicProfiles').doc(ownerId);
        const [listingSnap, ownerSnap, publicOwnerSnap] = await Promise.all([
          tx.get(listingRef),
          tx.get(ownerRef),
          tx.get(publicOwnerRef),
        ]);
        if (!listingSnap.exists) throw new NotFoundException('Listing not found');
        const currentOwnerData: any = ownerSnap.exists ? (ownerSnap.data() || {}) : (publicOwnerSnap.exists ? (publicOwnerSnap.data() || {}) : {});

        tx.delete(reviewRef);
        this.applyCounts(tx, { listingRef, ownerRef, publicOwnerRef }, currentOwnerData, listingSnap.data() || {}, -rating, -1, nowVal);
      });

      return { success: true };
    } catch (error: any) {
      if (error instanceof HttpException || typeof error?.getStatus === 'function') throw error;
      console.error('[Reviews] deleteReview failed', {
        reviewerId,
        reviewId,
        message: String(error?.message || error),
      });
      throw new ServiceUnavailableException('Unable to delete review right now');
    }
  }

  async listForListing(listingId: string, limit = 50) {
    if (!listingId) throw new BadRequestException('Missing listingId');
    const lim = Math.min(100, Math.max(1, limit));
    try {
      try {
        const snap = await admin.firestore()
          .collection('reviews')
          .where('listingId', '==', listingId)
          .where('status', '==', 'approved')
          .orderBy('createdAt', 'desc')
          .limit(lim)
          .get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      } catch {
        // Fallback for missing composite index in production.
        const snap = await admin.firestore()
          .collection('reviews')
          .where('listingId', '==', listingId)
          .limit(300)
          .get();
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((r: any) => String(r.status || '').toLowerCase() === 'approved')
          .sort((a: any, b: any) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt))
          .slice(0, lim);
      }
    } catch (error: any) {
      console.error('[Reviews] listForListing failed', { listingId, message: String(error?.message || error) });
      return [];
    }
  }

  async listForUser(userId: string, limit = 50) {
    if (!userId) throw new BadRequestException('Missing userId');
    const lim = Math.min(100, Math.max(1, limit));
    try {
      try {
        const snap = await admin.firestore()
          .collection('reviews')
          .where('ownerId', '==', userId)
          .where('status', '==', 'approved')
          .orderBy('createdAt', 'desc')
          .limit(lim)
          .get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      } catch {
        const snap = await admin.firestore()
          .collection('reviews')
          .where('ownerId', '==', userId)
          .limit(300)
          .get();
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((r: any) => String(r.status || '').toLowerCase() === 'approved')
          .sort((a: any, b: any) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt))
          .slice(0, lim);
      }
    } catch (error: any) {
      console.error('[Reviews] listForUser failed', { userId, message: String(error?.message || error) });
      return [];
    }
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
