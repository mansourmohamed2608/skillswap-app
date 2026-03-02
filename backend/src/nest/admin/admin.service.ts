import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { decrementListingCount } from '../../core/membership';
import { BANNED_KEYWORDS } from '../../core/banned-keywords';

type FlagType = 'listing' | 'wish' | 'review';
type UserRole = 'admin' | 'moderator' | 'user';
type UserStatus = 'active' | 'suspended' | 'banned';
const KEYWORDS_COLLECTION = 'moderationKeywords';
const KEYWORDS_DOC = 'active';
const normalizeKeyword = (value: string) => String(value || '').trim().toLowerCase();
const normalizeKeywords = (values: string[]) =>
  Array.from(new Set(values.map((value) => normalizeKeyword(value)).filter(Boolean)));
const DEFAULT_KEYWORDS = normalizeKeywords(BANNED_KEYWORDS);

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // In-process TTL cache: avoids a Firestore read on every admin action within the same
  // Cloud Functions instance.  A cache miss (first call, or after TTL) still hits Firestore.
  // TTL is 5 min — a revoked admin retains access for at most 5 min on a warm instance,
  // which is acceptable for internal tooling.
  private readonly adminCache = new Map<string, number>(); // uid → expiresAt ms
  private readonly ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private async assertAdmin(uid: string) {
    const now = Date.now();
    const cachedExpiry = this.adminCache.get(uid);
    if (cachedExpiry && cachedExpiry > now) return; // cache hit

    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    const role = (userSnap.data() as any)?.role;
    if (role !== 'admin') throw new ForbiddenException('Admin access required');

    this.adminCache.set(uid, now + this.ADMIN_CACHE_TTL_MS);
  }

  async listFlagged(uid: string) {
    await this.assertAdmin(uid);
    const db = admin.firestore();
    const [listingSnap, wishSnap, reviewSnap] = await Promise.all([
      db.collection('listings').where('flagged', '==', true).get(),
      db.collection('wishes').where('flagged', '==', true).get(),
      db.collection('reviews').where('flagged', '==', true).get(),
    ]);
    const items = [
      ...listingSnap.docs.map((d) => ({ id: d.id, type: 'listing' as const, data: d.data() })),
      ...wishSnap.docs.map((d) => ({ id: d.id, type: 'wish' as const, data: d.data() })),
      ...reviewSnap.docs.map((d) => ({ id: d.id, type: 'review' as const, data: d.data() })),
    ];
    items.sort((a, b) => {
      const at = (a.data as any)?.createdAt?.toDate ? (a.data as any).createdAt.toDate().getTime() : 0;
      const bt = (b.data as any)?.createdAt?.toDate ? (b.data as any).createdAt.toDate().getTime() : 0;
      return bt - at;
    });
    return { items };
  }

  async dismissFlag(uid: string, type: FlagType, id: string) {
    await this.assertAdmin(uid);
    if (!id) throw new BadRequestException('Missing content id');
    const docRef = this.getDocRef(type, id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Content not found');
    const data: any = snap.data() || {};

    if (type === 'review') {
      await admin.firestore().runTransaction(async (tx) => {
        const fresh = await tx.get(docRef);
        if (!fresh.exists) throw new NotFoundException('Review not found');
        const reviewData: any = fresh.data() || {};
        if (!reviewData.counted) {
          await this.applyReviewCounts(tx, reviewData);
        }
        tx.update(docRef, {
          flagged: false,
          flagReason: null,
          status: 'approved',
          moderatedAt: this.timestampValue(),
          moderatedBy: uid,
          counted: true,
        });
      });
    } else {
      await docRef.update({
        flagged: false,
        flagReason: null,
        moderatedAt: this.timestampValue(),
        moderatedBy: uid,
      });
    }

    await this.cleanupModerationFlags(type, id);
    await this.logAdminAction(uid, 'dismiss_flag', id, { type });
    return { success: true };
  }

  async removeFlagged(uid: string, type: FlagType, id: string) {
    await this.assertAdmin(uid);
    if (!id) throw new BadRequestException('Missing content id');
    const docRef = this.getDocRef(type, id);
    const snap = await docRef.get();
    if (!snap.exists) throw new NotFoundException('Content not found');
    const data: any = snap.data() || {};

    if (type === 'listing') {
      const wasActive = this.isListingActive(String(data.status || 'open'));
      await docRef.update({
        flagged: false,
        flagReason: null,
        status: 'removed',
        removedAt: this.timestampValue(),
        removedBy: uid,
        moderatedAt: this.timestampValue(),
        moderatedBy: uid,
      });
      if (wasActive) {
        const ownerId = data.userId || data.offeredByUserId;
        if (ownerId) await decrementListingCount(ownerId);
      }
    } else if (type === 'wish') {
      await docRef.update({
        flagged: false,
        flagReason: null,
        status: 'removed',
        removedAt: this.timestampValue(),
        removedBy: uid,
        moderatedAt: this.timestampValue(),
        moderatedBy: uid,
      });
    } else if (type === 'review') {
      await admin.firestore().runTransaction(async (tx) => {
        const fresh = await tx.get(docRef);
        if (!fresh.exists) throw new NotFoundException('Review not found');
        const reviewData: any = fresh.data() || {};
        if (reviewData.counted) {
          await this.removeReviewCounts(tx, reviewData);
        }
        tx.update(docRef, {
          flagged: false,
          flagReason: null,
          status: 'removed',
          moderatedAt: this.timestampValue(),
          moderatedBy: uid,
          counted: false,
        });
      });
    }

    await this.cleanupModerationFlags(type, id);
    await this.logAdminAction(uid, 'remove_flagged', id, { type });
    return { success: true };
  }

  async listUsers(uid: string, limit = 50) {
    await this.assertAdmin(uid);
    const safeLimit = Math.min(200, Math.max(1, Number(limit || 50)));
    const snap = await admin.firestore()
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    const users = snap.docs.map((doc) => {
      const data: any = doc.data() || {};
      return {
        id: doc.id,
        email: data.email || null,
        name: data.fullName || data.name || data.displayName || null,
        role: data.role || 'user',
        accountStatus: data.accountStatus || 'active',
        createdAt: data.createdAt || null,
      };
    });
    return { users };
  }

  async updateUserRole(uid: string, targetUid: string, role: UserRole) {
    await this.assertAdmin(uid);
    if (!targetUid) throw new BadRequestException('Missing user id');
    if (!role) throw new BadRequestException('Missing role');
    if (!['admin', 'moderator', 'user'].includes(role)) throw new BadRequestException('Invalid role');
    const userRef = admin.firestore().collection('users').doc(targetUid);
    const snap = await userRef.get();
    if (!snap.exists) throw new NotFoundException('User not found');

    // Write Firestore first (source of truth), then propagate to Firebase Custom Claims
    // so that the user's next issued token carries the role (eliminates DB read in assertAdmin
    // for other admin users whose tokens already have the claim).
    await userRef.set({
      role,
      roleUpdatedAt: this.timestampValue(),
      roleUpdatedBy: uid,
    }, { merge: true });

    // Propagate to Firebase Custom Claims for fast token-based role checks
    try {
      await admin.auth().setCustomUserClaims(targetUid, { role });
      // Invalidate any local admin cache for this user in case role was demoted
      this.adminCache.delete(targetUid);
    } catch (e: any) {
      // Log but do NOT fail — Firestore is the authoritative source
      this.logger.warn({ event: 'set_custom_claims_failed', targetUid, role, error: e?.message }, 'Failed to set custom claims');
    }

    await this.logAdminAction(uid, 'set_role', targetUid, { role });
    return { success: true };
  }

  async updateUserStatus(uid: string, targetUid: string, status: UserStatus) {
    await this.assertAdmin(uid);
    if (!targetUid) throw new BadRequestException('Missing user id');
    if (!status) throw new BadRequestException('Missing status');
    if (!['active', 'suspended', 'banned'].includes(status)) throw new BadRequestException('Invalid status');
    const userRef = admin.firestore().collection('users').doc(targetUid);
    const snap = await userRef.get();
    if (!snap.exists) throw new NotFoundException('User not found');
    const update: Record<string, any> = {
      accountStatus: status,
      statusUpdatedAt: this.timestampValue(),
      statusUpdatedBy: uid,
    };
    if (status === 'suspended') update.suspendedAt = this.timestampValue();
    if (status === 'banned') update.bannedAt = this.timestampValue();
    if (status === 'active') {
      update.suspendedAt = null;
      update.bannedAt = null;
    }
    await userRef.set(update, { merge: true });
    await this.logAdminAction(uid, 'set_status', targetUid, { status });
    return { success: true };
  }

  async listAudit(uid: string, limit = 50) {
    await this.assertAdmin(uid);
    const safeLimit = Math.min(200, Math.max(1, Number(limit || 50)));
    const snap = await admin.firestore()
      .collection('adminAudit')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    return { items };
  }

  async listAnalytics(uid: string, limit = 200) {
    await this.assertAdmin(uid);
    const safeLimit = Math.min(500, Math.max(1, Number(limit || 200)));
    const snap = await admin.firestore()
      .collection('analytics_events')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    const counts: Record<string, number> = {};
    items.forEach((item: any) => {
      const name = String(item.name || 'unknown');
      counts[name] = (counts[name] || 0) + 1;
    });
    const summary = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { summary, items };
  }

  async listReports(uid: string, limit = 50) {
    await this.assertAdmin(uid);
    const safeLimit = Math.min(200, Math.max(1, Number(limit || 50)));
    const snap = await admin.firestore()
      .collection('moderationReports')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    return { items };
  }

  async resolveReport(uid: string, reportId: string, action: 'dismiss' | 'remove' = 'dismiss') {
    await this.assertAdmin(uid);
    if (!reportId) throw new BadRequestException('Missing report id');
    const reportRef = admin.firestore().collection('moderationReports').doc(reportId);
    const snap = await reportRef.get();
    if (!snap.exists) throw new NotFoundException('Report not found');
    const data: any = snap.data() || {};
    const type = String(data.type || '');
    const contentId = String(data.contentId || '');
    if (!type || !contentId) throw new BadRequestException('Report missing content info');

    if (action === 'remove') {
      await this.removeFlagged(uid, type as any, contentId);
    }

    await reportRef.set({
      status: 'resolved',
      resolvedAt: this.timestampValue(),
      resolvedBy: uid,
      action,
    }, { merge: true });

    await this.logAdminAction(uid, 'resolve_report', reportId, { action, type, contentId });
    return { success: true };
  }

  async listKeywords(uid: string) {
    await this.assertAdmin(uid);
    const { keywords } = await this.readKeywords();
    return { keywords };
  }

  async addKeywords(uid: string, payload: { keyword?: string; keywords?: string[] }) {
    await this.assertAdmin(uid);
    const toAdd = this.parseKeywordsPayload(payload);
    if (!toAdd.length) throw new BadRequestException('Missing keyword');
    const { keywords } = await this.readKeywords();
    const next = normalizeKeywords([...keywords, ...toAdd]);
    await this.writeKeywords(uid, next);
    return { keywords: next };
  }

  async removeKeywords(uid: string, payload: { keyword?: string; keywords?: string[] }) {
    await this.assertAdmin(uid);
    const toRemove = this.parseKeywordsPayload(payload);
    if (!toRemove.length) throw new BadRequestException('Missing keyword');
    const removeSet = new Set(toRemove);
    const { keywords } = await this.readKeywords();
    const next = keywords.filter((keyword) => !removeSet.has(keyword));
    await this.writeKeywords(uid, next);
    return { keywords: next };
  }

  private getDocRef(type: FlagType, id: string) {
    const db = admin.firestore();
    if (type === 'listing') return db.collection('listings').doc(id);
    if (type === 'wish') return db.collection('wishes').doc(id);
    if (type === 'review') return db.collection('reviews').doc(id);
    throw new BadRequestException('Invalid content type');
  }

  private async cleanupModerationFlags(type: FlagType, id: string) {
    try {
      const snap = await admin.firestore()
        .collection('moderationFlags')
        .where('type', '==', type)
        .where('contentId', '==', id)
        .get();
      const batch = admin.firestore().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    } catch (e) {
      this.logger.warn(`Failed to cleanup moderation flags: ${(e as any)?.message || e}`);
    }
  }

  private async logAdminAction(actorId: string, action: string, targetId: string, details?: Record<string, any>) {
    const createdAt = this.timestampValue();
    await admin.firestore().collection('adminAudit').add({
      actorId,
      action,
      targetId,
      details: details || null,
      createdAt,
    });
  }

  private keywordsDocRef() {
    return admin.firestore().collection(KEYWORDS_COLLECTION).doc(KEYWORDS_DOC);
  }

  private parseKeywordsPayload(payload: { keyword?: string; keywords?: string[] }) {
    const keyword = payload?.keyword;
    const keywords = payload?.keywords;
    const list = Array.isArray(keywords) ? keywords : (keyword ? [keyword] : []);
    return normalizeKeywords(list);
  }

  private async readKeywords() {
    const docRef = this.keywordsDocRef();
    const snap = await docRef.get();
    const data = snap.exists ? snap.data() : null;
    const raw = Array.isArray(data?.keywords) ? (data?.keywords as string[]) : null;
    if (!raw) {
      return { keywords: DEFAULT_KEYWORDS, hasCustom: false };
    }
    return { keywords: normalizeKeywords(raw), hasCustom: true };
  }

  private async writeKeywords(uid: string, keywords: string[]) {
    await this.keywordsDocRef().set({
      keywords,
      updatedAt: this.timestampValue(),
      updatedBy: uid,
    }, { merge: true });
  }

  private async applyReviewCounts(tx: FirebaseFirestore.Transaction, reviewData: any) {
    const listingId = String(reviewData.listingId || '');
    const ownerId = String(reviewData.ownerId || '');
    const rating = Number(reviewData.rating || 0);
    if (!listingId || !ownerId || !Number.isFinite(rating)) return;

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const listingSnap = await tx.get(listingRef);
    if (listingSnap.exists) {
      const listingData: any = listingSnap.data() || {};
      const sum = Number(listingData.ratingSum || 0);
      const count = Number(listingData.reviewsCount || 0);
      const nextSum = sum + rating;
      const nextCount = count + 1;
      const nextRating = Number((nextSum / nextCount).toFixed(2));
      tx.update(listingRef, {
        ratingSum: nextSum,
        reviewsCount: nextCount,
        rating: nextRating,
      });
    }

    const ownerRef = admin.firestore().collection('users').doc(ownerId);
    const ownerSnap = await tx.get(ownerRef);
    if (ownerSnap.exists) {
      const ownerData: any = ownerSnap.data() || {};
      const sum = Number(ownerData.ratingSum || 0);
      const count = Number(ownerData.reviewsCount || 0);
      const nextSum = sum + rating;
      const nextCount = count + 1;
      const nextRating = Number((nextSum / nextCount).toFixed(2));
      tx.update(ownerRef, {
        ratingSum: nextSum,
        reviewsCount: nextCount,
        rating: nextRating,
      });
    }
  }

  private async removeReviewCounts(tx: FirebaseFirestore.Transaction, reviewData: any) {
    const listingId = String(reviewData.listingId || '');
    const ownerId = String(reviewData.ownerId || '');
    const rating = Number(reviewData.rating || 0);
    if (!listingId || !ownerId || !Number.isFinite(rating)) return;

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const listingSnap = await tx.get(listingRef);
    if (listingSnap.exists) {
      const listingData: any = listingSnap.data() || {};
      const sum = Number(listingData.ratingSum || 0);
      const count = Number(listingData.reviewsCount || 0);
      const nextSum = Math.max(0, sum - rating);
      const nextCount = Math.max(0, count - 1);
      const nextRating = nextCount > 0 ? Number((nextSum / nextCount).toFixed(2)) : 0;
      tx.update(listingRef, {
        ratingSum: nextSum,
        reviewsCount: nextCount,
        rating: nextRating,
      });
    }

    const ownerRef = admin.firestore().collection('users').doc(ownerId);
    const ownerSnap = await tx.get(ownerRef);
    if (ownerSnap.exists) {
      const ownerData: any = ownerSnap.data() || {};
      const sum = Number(ownerData.ratingSum || 0);
      const count = Number(ownerData.reviewsCount || 0);
      const nextSum = Math.max(0, sum - rating);
      const nextCount = Math.max(0, count - 1);
      const nextRating = nextCount > 0 ? Number((nextSum / nextCount).toFixed(2)) : 0;
      tx.update(ownerRef, {
        ratingSum: nextSum,
        reviewsCount: nextCount,
        rating: nextRating,
      });
    }
  }

  private isListingActive(status: string): boolean {
    const normalized = String(status || 'open').toLowerCase();
    return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
  }

  private timestampValue() {
    return (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  }
}
