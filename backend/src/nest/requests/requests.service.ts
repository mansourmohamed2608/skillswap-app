import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { canCreateBooking, getUserDocument, incrementBookingCount, decrementListingCount } from '../../core/membership';
import { sendInAppNotification, sendPushNotification, sendEmailNotification } from '../../core/notifications';
import { findBannedKeywordInFields } from '../../core/moderation-utils';
import { createRequestPublicId } from '../../core/public-ids';

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  async createRequest(userId: string, params: { listingId: string; proposedTime?: string; message?: string }) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    const { listingId, proposedTime, message } = params;
    if (!listingId) throw new BadRequestException('Missing listingId');
    const banned = await findBannedKeywordInFields([
      { label: 'message', value: message },
    ]);
    if (banned) {
      throw new BadRequestException({ code: 'content/banned', field: banned.field });
    }

    const listingSnap = await admin.firestore().collection('listings').doc(listingId).get();
    if (!listingSnap.exists) throw new NotFoundException('Listing not found');
    const listingData = listingSnap.data() || {};
    const ownerId: string = (listingData as any).userId || (listingData as any).offeredByUserId;
    if (!ownerId) throw new ForbiddenException('Listing missing ownerId');

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const membership = userSnap.get('membership');
    const check = canCreateBooking(membership);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    const docRef = admin.firestore().collection('requests').doc();
    const publicId = createRequestPublicId({
      id: docRef.id,
      listingId,
      ownerId,
      requesterId: userId,
    });
    const requestDoc = {
      listingId,
      ownerId,
      requesterId: userId,
      publicId,
      proposedTime: proposedTime ? new Date(proposedTime) : null,
      message: message || '',
      status: 'pending',
      createdAt: createdAtVal,
    };
    await docRef.set(requestDoc);
    await incrementBookingCount(userId);

    try {
      const cleanLink = `/bookings/${publicId}`;
      await sendInAppNotification({
        userId: ownerId,
        type: 'request',
        content: `New exchange request for your listing`,
        link: cleanLink,
        listingId,
        requesterId: userId,
      });
      await sendPushNotification(ownerId, 'New exchange request', 'You received a new request.', cleanLink);
      await sendEmailNotification(ownerId, 'New exchange request', 'You have a new exchange request on your listing.');
    } catch (e) {
      this.logger.error('Failed to send notifications for owner', e);
    }

    return { id: docRef.id, publicId };
  }

  async reschedule(userId: string, requestId: string, proposedTime: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!requestId) throw new BadRequestException('Missing request id');
    if (!proposedTime) throw new BadRequestException('Missing proposedTime');

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const membership = userSnap.get('membership');
    const check = canCreateBooking(membership);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new NotFoundException('Request not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).ownerId;
    const existingRequesterId: string | undefined = (data as any).requesterId;
    if (existingRequesterId !== userId && ownerId !== userId) {
      throw new ForbiddenException('Not authorized to modify this request');
    }

    await reqRef.update({ proposedTime: new Date(proposedTime) });
    return { success: true };
  }

  async accept(userId: string, requestId: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!requestId) throw new BadRequestException('Missing request id');

    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new NotFoundException('Request not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).ownerId;
    const requesterId: string | undefined = (data as any).requesterId;
    const listingId: string | undefined = (data as any).listingId;
    if (!ownerId || !requesterId || !listingId) throw new BadRequestException('Invalid request payload');
    if (ownerId !== userId) throw new ForbiddenException('Not authorized to accept this request');

    const status = String((data as any).status || 'pending').toLowerCase();
    if (status !== 'pending') throw new BadRequestException(`Request already ${status}`);
    const publicId = String((data as any).publicId || createRequestPublicId({
      id: requestId,
      listingId,
      ownerId,
      requesterId,
    }));

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);
    const membership = userSnap.get('membership');
    const check = canCreateBooking(membership);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const listingSnap = await admin.firestore().collection('listings').doc(listingId).get();
    if (!listingSnap.exists) throw new NotFoundException('Listing not found');
    const listingData = listingSnap.data() || {};
    const listingStatus = String((listingData as any).status || 'open').toLowerCase();
    if (['removed', 'fulfilled', 'closed'].includes(listingStatus)) {
      throw new BadRequestException('Listing is no longer active');
    }

    // Verify requester also has an active membership before accepting on their behalf
    const requesterSnap = await getUserDocument(requesterId);
    this.ensureKycVerified(requesterSnap);
    const requesterMembership = requesterSnap.get('membership');
    const requesterCheck = canCreateBooking(requesterMembership);
    if (!requesterCheck.allowed) {
      throw new ForbiddenException(`Requester membership inactive: ${requesterCheck.reason}`);
    }

    // Use a sentinel document in a transaction to prevent double-accept race conditions.
    // Firestore transactions only support document reads, not collection queries,
    // so we track the accepted requestId in a dedicated document.
    const sentinelRef = admin.firestore().collection('listingBookings').doc(listingId);
    const nowVal = new Date();
    await admin.firestore().runTransaction(async (tx) => {
      const sentinelSnap = await tx.get(sentinelRef);
      const existingAcceptedId: string | undefined = sentinelSnap.exists
        ? (sentinelSnap.data() as any)?.acceptedRequestId
        : undefined;
      if (existingAcceptedId && existingAcceptedId !== requestId) {
        throw new BadRequestException('Another request is already accepted for this listing');
      }
      tx.set(sentinelRef, { acceptedRequestId: requestId, acceptedAt: nowVal }, { merge: true });
      tx.update(reqRef, {
        status: 'accepted',
        acceptedAt: nowVal,
        acceptedBy: userId,
        updatedAt: nowVal,
      });
    });
    await incrementBookingCount(ownerId);

    try {
      const cleanLink = `/bookings/${publicId}`;
      await sendInAppNotification({
        userId: requesterId,
        type: 'request',
        content: `Your exchange request was accepted`,
        link: cleanLink,
        listingId,
        requesterId,
      });
      await sendPushNotification(requesterId, 'Request accepted', 'Your exchange request was accepted.', cleanLink);
      await sendEmailNotification(requesterId, 'Request accepted', 'Your exchange request was accepted.');
    } catch (e) {
      this.logger.error('Failed to send accept notifications', e);
    }

    return { success: true };
  }

  async decline(userId: string, requestId: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!requestId) throw new BadRequestException('Missing request id');

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);

    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new NotFoundException('Request not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).ownerId;
    const requesterId: string | undefined = (data as any).requesterId;
    const listingId: string | undefined = (data as any).listingId;
    if (!ownerId || !requesterId || !listingId) throw new BadRequestException('Invalid request payload');
    if (ownerId !== userId) throw new ForbiddenException('Not authorized to decline this request');

    const status = String((data as any).status || 'pending').toLowerCase();
    if (status !== 'pending') throw new BadRequestException(`Request already ${status}`);
    const publicId = String((data as any).publicId || createRequestPublicId({
      id: requestId,
      listingId,
      ownerId,
      requesterId,
    }));

    const nowVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    await reqRef.update({
      status: 'declined',
      declinedAt: nowVal,
      declinedBy: userId,
      updatedAt: nowVal,
    });

    try {
      const cleanLink = `/bookings/${publicId}`;
      await sendInAppNotification({
        userId: requesterId,
        type: 'request',
        content: `Your exchange request was declined`,
        link: cleanLink,
        listingId,
        requesterId,
      });
      await sendPushNotification(requesterId, 'Request declined', 'Your exchange request was declined.', cleanLink);
      await sendEmailNotification(requesterId, 'Request declined', 'Your exchange request was declined.');
    } catch (e) {
      this.logger.warn('Failed to send decline notifications', e);
    }

    return { success: true };
  }

  async cancel(userId: string, requestId: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!requestId) throw new BadRequestException('Missing request id');

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);

    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new NotFoundException('Request not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).ownerId;
    const requesterId: string | undefined = (data as any).requesterId;
    const listingId: string | undefined = (data as any).listingId;
    if (!ownerId || !requesterId || !listingId) throw new BadRequestException('Invalid request payload');
    if (ownerId !== userId && requesterId !== userId) {
      throw new ForbiddenException('Not authorized to cancel this request');
    }

    const status = String((data as any).status || 'pending').toLowerCase();
    if (['declined', 'cancelled', 'completed'].includes(status)) {
      throw new BadRequestException(`Request already ${status}`);
    }
    const publicId = String((data as any).publicId || createRequestPublicId({
      id: requestId,
      listingId,
      ownerId,
      requesterId,
    }));

    const nowVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    await reqRef.update({
      status: 'cancelled',
      cancelledAt: nowVal,
      cancelledBy: userId,
      updatedAt: nowVal,
    });

    const otherId = ownerId === userId ? requesterId : ownerId;
    try {
      const cleanLink = `/bookings/${publicId}`;
      await sendInAppNotification({
        userId: otherId,
        type: 'request',
        content: `An exchange request was cancelled`,
        link: cleanLink,
        listingId,
        requesterId,
      });
      await sendPushNotification(otherId, 'Request cancelled', 'An exchange request was cancelled.', cleanLink);
      await sendEmailNotification(otherId, 'Request cancelled', 'An exchange request was cancelled.');
    } catch (e) {
      this.logger.warn('Failed to send cancel notifications', e);
    }

    return { success: true };
  }

  async complete(userId: string, requestId: string) {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!requestId) throw new BadRequestException('Missing request id');

    const userSnap = await getUserDocument(userId);
    this.ensureKycVerified(userSnap);

    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new NotFoundException('Request not found');
    const data = snap.data() || {};
    const ownerId: string | undefined = (data as any).ownerId;
    const requesterId: string | undefined = (data as any).requesterId;
    const listingId: string | undefined = (data as any).listingId;
    if (!ownerId || !requesterId || !listingId) throw new BadRequestException('Invalid request payload');
    if (ownerId !== userId && requesterId !== userId) {
      throw new ForbiddenException('Not authorized to complete this request');
    }

    const status = String((data as any).status || 'pending').toLowerCase();
    if (status !== 'accepted') throw new BadRequestException(`Request must be accepted before completion (current: ${status})`);

    const nowVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    await reqRef.update({
      status: 'completed',
      completedAt: nowVal,
      completedBy: userId,
      updatedAt: nowVal,
    });

    const listingRef = admin.firestore().collection('listings').doc(listingId);
    const listingSnap = await listingRef.get();
    if (listingSnap.exists) {
      const listingData = listingSnap.data() || {};
      const listingStatus = String((listingData as any).status || 'open').toLowerCase();
      if (!['removed', 'fulfilled'].includes(listingStatus)) {
        await listingRef.set({ status: 'fulfilled', fulfilledAt: nowVal, updatedAt: nowVal }, { merge: true });
        if (this.isListingActive(listingStatus)) {
          await decrementListingCount(ownerId);
        }
      }
    }

    const otherId = ownerId === userId ? requesterId : ownerId;
    try {
      await sendInAppNotification({
        userId: otherId,
        type: 'request',
        content: `An exchange request was marked completed`,
        link: `/requests/${requestId}`,
        listingId,
        requesterId,
      });
      await sendPushNotification(otherId, 'Request completed', 'An exchange request was completed.', `/requests/${requestId}`);
      await sendEmailNotification(otherId, 'Request completed', 'An exchange request was completed.');
    } catch (e) {
      this.logger.warn('Failed to send completion notifications', e);
    }

    return { success: true };
  }

  private isListingActive(status: string | undefined): boolean {
    const normalized = String(status || 'open').toLowerCase();
    return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }
}
