import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument } from '../../core/membership';

type ReportType = 'listing' | 'wish' | 'review';

@Injectable()
export class ReportsService {
  async submitReport(uid: string, payload: { type?: string; contentId?: string; reason?: string; note?: string }) {
    if (!uid) throw new UnauthorizedException('Authentication required');
    const userSnap = await getUserDocument(uid);
    this.ensureKycVerified(userSnap);
    const type = String(payload?.type || '').trim().toLowerCase() as ReportType;
    const contentId = String(payload?.contentId || '').trim();
    const reason = String(payload?.reason || '').trim();
    const note = payload?.note ? String(payload.note).trim() : '';
    if (!type || !['listing', 'wish', 'review'].includes(type)) {
      throw new BadRequestException('Invalid report type');
    }
    if (!contentId) throw new BadRequestException('Missing contentId');
    if (!reason) throw new BadRequestException('Missing reason');

    const ownerId = await this.resolveOwnerId(type, contentId);
    if (ownerId && ownerId === uid) {
      throw new BadRequestException({ code: 'reports/own_content' });
    }
    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    const docRef = await admin.firestore().collection('moderationReports').add({
      type,
      contentId,
      reason,
      note: note || null,
      reporterId: uid,
      ownerId: ownerId || null,
      status: 'open',
      createdAt: createdAtVal,
    });
    return { id: docRef.id };
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }

  private async resolveOwnerId(type: ReportType, contentId: string): Promise<string | null> {
    const db = admin.firestore();
    const ref = type === 'listing'
      ? db.collection('listings').doc(contentId)
      : type === 'wish'
        ? db.collection('wishes').doc(contentId)
        : db.collection('reviews').doc(contentId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('Content not found');
    const data: any = snap.data() || {};
    if (type === 'review') return data.ownerId || null;
    return data.userId || data.offeredByUserId || null;
  }
}
