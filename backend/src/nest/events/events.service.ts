import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getUserDocument, isMembershipActive } from '../../core/membership';
import { findBannedKeywordInFields } from '../../core/moderation-utils';

@Injectable()
export class EventsService {
  async listEvents(limit = 30) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit || 30)));
    const snap = await admin.firestore()
      .collection('events')
      .orderBy('createdAt', 'desc')
      .limit(safeLimit)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
    return { items };
  }

  async createEvent(userId: string, payload: any) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    const { title, description, location, startsAt, endsAt, capacity, coverUrl } = payload || {};
    if (!title || typeof title !== 'string') throw new BadRequestException('Missing title');
    if (!startsAt) throw new BadRequestException('Missing startsAt');
    const banned = await findBannedKeywordInFields([
      { label: 'title', value: title },
      { label: 'description', value: description },
      { label: 'location', value: location },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field });
    }

    const actorSnap = await getUserDocument(userId);
    this.ensureKycVerified(actorSnap);
    const { ownerId, ownerSnap } = await this.resolveBusinessOwner(actorSnap);
    this.ensureBusinessPlan(ownerSnap);

    const startsAtDate = new Date(startsAt);
    if (Number.isNaN(startsAtDate.getTime())) throw new BadRequestException('Invalid startsAt');
    const endsAtDate = endsAt ? new Date(endsAt) : null;
    if (endsAt && Number.isNaN(endsAtDate?.getTime() || NaN)) {
      throw new BadRequestException('Invalid endsAt');
    }

    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();

    const cap = capacity ? Math.max(1, Number(capacity)) : null;
    const docRef = await admin.firestore().collection('events').add({
      title: title.trim(),
      description: String(description || '').trim(),
      location: String(location || '').trim(),
      startsAt: startsAtDate,
      endsAt: endsAtDate || null,
      capacity: cap,
      registrationsCount: 0,
      coverUrl: coverUrl ? String(coverUrl) : null,
      ownerId,
      createdByUserId: userId,
      status: 'active',
      createdAt: createdAtVal,
    });

    return { id: docRef.id };
  }

  async register(userId: string, eventId: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!eventId) throw new BadRequestException('Missing event id');

    const eventRef = admin.firestore().collection('events').doc(eventId);
    const regRef = admin.firestore().collection('eventRegistrations').doc();

    let alreadyRegistered = false;
    await admin.firestore().runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) throw new NotFoundException('Event not found');
      const data: any = eventSnap.data() || {};
      if (String(data.status || 'active') !== 'active') throw new BadRequestException('Event is not active');
      const existingSnap = await tx.get(
        admin.firestore()
          .collection('eventRegistrations')
          .where('eventId', '==', eventId)
          .where('userId', '==', userId)
          .limit(1)
      );
      if (!existingSnap.empty) {
        alreadyRegistered = true;
        return;
      }
      const capacity = Number(data.capacity || 0);
      const current = Number(data.registrationsCount || 0);
      if (capacity && current >= capacity) {
        throw new BadRequestException('Event is full');
      }
      tx.set(regRef, {
        eventId,
        userId,
        createdAt: this.timestampValue(),
      });
      tx.update(eventRef, { registrationsCount: current + 1 });
    });

    return { success: true, alreadyRegistered };
  }

  private ensureBusinessPlan(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const membership = userSnap.get('membership');
    if (membership?.plan !== 'Business' || !isMembershipActive(membership)) {
      throw new ForbiddenException('Business plan required');
    }
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
      return { ownerId: actorSnap.id, ownerSnap: actorSnap };
    }
    const ownerSnap = await admin.firestore()
      .collection('users')
      .where('businessProfile.teamMembers', 'array-contains', email)
      .limit(1)
      .get();
    if (ownerSnap.empty) {
      return { ownerId: actorSnap.id, ownerSnap: actorSnap };
    }
    const ownerDoc = ownerSnap.docs[0];
    return { ownerId: ownerDoc.id, ownerSnap: ownerDoc };
  }

  private timestampValue() {
    return (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
      ? (admin.firestore.FieldValue as any).serverTimestamp()
      : new Date();
  }
}
