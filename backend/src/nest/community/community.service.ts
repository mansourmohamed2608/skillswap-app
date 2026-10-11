import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

type MemberHighlight = {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  location?: string;
};

type CompletedSwap = {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
};

@Injectable()
export class CommunityService {
  private number(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  async getHighlights(): Promise<{ memberHighlights: MemberHighlight[]; completedSwaps: CompletedSwap[] }> {
    const firestore = admin.firestore();
    const [profilesResult, completedResult] = await Promise.allSettled([
      firestore.collection('publicProfiles').orderBy('rating', 'desc').limit(12).get(),
      firestore.collection('listings').where('status', '==', 'completed').limit(12).get(),
    ]);

    const memberHighlights: MemberHighlight[] = profilesResult.status === 'fulfilled'
      ? profilesResult.value.docs
          .flatMap((doc): MemberHighlight[] => {
            const data = doc.data() || {};
            const rating = this.number(data.rating);
            const reviewsCount = this.number(data.reviewsCount);
            const name = String(data.name || data.fullName || data.displayName || '').trim();
            if (!name || rating <= 0 || reviewsCount <= 0) return [];
            const location = String(data.location || data.city || '').trim();
            return [{
              id: doc.id,
              name,
              rating,
              reviewsCount,
              ...(location ? { location } : {}),
            }];
          })
          .slice(0, 2)
      : [];

    const completedDocs = completedResult.status === 'fulfilled' ? completedResult.value.docs : [];
    const ownerIds = Array.from(new Set(completedDocs
      .map((doc) => String((doc.data() || {}).userId || (doc.data() || {}).offeredByUserId || '').trim())
      .filter(Boolean)));
    const ownerDocs = ownerIds.length
      ? await firestore.getAll(...ownerIds.map((id) => firestore.collection('publicProfiles').doc(id)))
      : [];
    const ownerNames = new Map(ownerDocs.map((doc) => [
      doc.id,
      String((doc.data() || {}).name || (doc.data() || {}).fullName || (doc.data() || {}).displayName || '').trim(),
    ]));

    const completedSwaps = completedDocs
      .flatMap((doc): CompletedSwap[] => {
        const data = doc.data() || {};
        if (data.flagged === true || String(data.status || '').toLowerCase() !== 'completed') return [];
        const ownerId = String(data.userId || data.offeredByUserId || '').trim();
        const offered = data.offeredService || {};
        const title = String(offered.title || data.title || '').trim();
        const category = String(offered.category || data.category || '').trim();
        const description = String(offered.description || data.description || '').trim();
        if (!ownerId || !title || !category || !description) return [];
        const ownerName = ownerNames.get(ownerId);
        const imageUrl = String(offered.imageUrl || data.imageUrl || '').trim();
        return [{
          id: doc.id,
          ownerId,
          ...(ownerName ? { ownerName } : {}),
          title,
          category,
          description,
          ...(imageUrl ? { imageUrl } : {}),
        }];
      })
      .slice(0, 2);

    return { memberHighlights, completedSwaps };
  }
}
