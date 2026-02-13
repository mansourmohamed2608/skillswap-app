import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument } from '../../core/membership';
import { createGeideaDonationSession } from '../../core/payments';
import { saveDonationRecord } from '../../core/postgres';
import { findBannedKeywordInFields } from '../../core/moderation-utils';

@Injectable()
export class WishesService {
  async create(userId: string, body: any) {
    if (!userId) throw new UnauthorizedException('Unauthenticated request');
    const { title, description, goalAmount, currency, category, deadline, imageUrl, videoUrl } = body || {};
    if (!title || !description) throw new BadRequestException('Missing title or description');
    const banned = await findBannedKeywordInFields([
      { label: 'title', value: title },
      { label: 'description', value: description },
      { label: 'category', value: category },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field });
    }
    const ga = Number(goalAmount || 0);
    if (!(ga > 0)) throw new BadRequestException('Invalid goalAmount');
    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const membership = userSnap.get('membership');
    const active = membership && membership.active && (membership.endDate?.toDate ? membership.endDate.toDate() > new Date() : new Date(membership.endDate) > new Date());
    if (!active) throw new ForbiddenException('Active membership required to create a wish');
    const ts = (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
    const parsedDeadline = deadline ? new Date(deadline) : undefined;
    const docRef = await admin.firestore().collection('wishes').add({
      userId,
      title,
      description,
      goalAmount: ga,
      currency: currency || 'EGP',
      totalDonated: 0,
      donationCount: 0,
      status: 'open',
      flagged: false,
      category: category || null,
      deadline: parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline : null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      createdAt: ts,
    });
    return { id: docRef.id };
  }

  async donate(wishId: string, body: any) {
    const { amount, donorName, donorEmail, anonymous } = body || {};
    const amt = Number(amount || 0);
    if (!wishId) throw new BadRequestException('Missing wishId');
    if (!(amt > 0)) throw new BadRequestException('Invalid amount');
    const email = String(donorEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Invalid email');

    const wishRef = admin.firestore().collection('wishes').doc(wishId);
    const wishSnap = await wishRef.get();
    if (!wishSnap.exists) throw new NotFoundException('Wish not found');
    const wish = wishSnap.data() as any;

    const currency = wish.currency || 'EGP';
    const normalizedName = anonymous ? 'Anonymous' : String(donorName || '').trim() || 'Anonymous';
    const { paymentUrl, sessionId } = await createGeideaDonationSession({
      amount: amt,
      currency,
      donorEmail: email,
      donorName: normalizedName,
      referenceId: wishId,
    });

    const now = new Date();
    const donation = {
      wishId,
      wishTitle: wish.title || null,
      amount: amt,
      currency,
      donorName: normalizedName,
      donorEmail: email,
      anonymous: Boolean(anonymous),
      status: 'PENDING',
      provider: sessionId.startsWith('mock_') ? 'mock' : 'geidea',
      geideaSessionId: sessionId,
      createdAt: now,
      updatedAt: now,
    };
    await admin.firestore().collection('wishDonations').add(donation);
    await saveDonationRecord({
      wishId,
      geideaSessionId: sessionId,
      donorEmail: email,
      donorName: normalizedName,
      amount: amt,
      currency,
      status: 'PENDING',
      createdAt: now,
    });

    return { paymentUrl, sessionId };
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
