import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { getUserDocument, canCreateBooking, incrementBookingCount, isMembershipActive } from './core/membership';
import { sendInAppNotification, sendPushNotification, sendEmailNotification } from './core/notifications';

/**
 * Create a new service exchange request.
 *
 * The request body must include:
 *   - listingId: ID of the listing being requested.
 *   - proposedTime: optional ISO string or timestamp representing when the requester proposes to exchange.
 *   - message: optional text describing details of the request.
 *
 * The authenticated user's UID is taken from req.user (see authMiddleware).
 *
 * A Firestore document is created in the `requests` collection with status "pending".
 * The listing owner will need to accept or decline the request in a future phase.
 */
export async function createRequest(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const requesterId: string = authUser.uid;
    const { listingId, proposedTime, message } = req.body || {};
    if (!listingId) {
      res.status(400).json({ error: 'Missing listingId' });
      return;
    }
    // Fetch the listing to find its owner
    const listingSnap = await admin.firestore().collection('listings').doc(listingId).get();
    if (!listingSnap.exists) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    const listingData = listingSnap.data() || {};
    const ownerId: string = (listingData as any).userId || (listingData as any).offeredByUserId;
    if (!ownerId) {
      res.status(500).json({ error: 'Listing document missing ownerId' });
      return;
    }
    // Enforce booking limits based on membership plan.
    const userSnap = await getUserDocument(requesterId);
    const membership = userSnap.get('membership');
    const check = canCreateBooking(membership);
    if (!check.allowed) {
      res.status(403).json({ error: check.reason });
      return;
    }
    // As with other uses of serverTimestamp(), provide a fallback when
    // admin.firestore.FieldValue.serverTimestamp() is undefined (e.g. Node 22).
    const createdAtVal =
      (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
        ? (admin.firestore.FieldValue as any).serverTimestamp()
        : new Date();
    const requestDoc = {
      listingId,
      ownerId,
      requesterId,
      proposedTime: proposedTime ? new Date(proposedTime) : null,
      message: message || '',
      status: 'pending',
      createdAt: createdAtVal,
    };
  const docRef = await admin.firestore().collection('requests').add(requestDoc);
  // Increment booking counter for the requester
  await incrementBookingCount(requesterId);
  // Notifications (in-app + optional email/push)
  try {
    await sendInAppNotification({
      userId: ownerId,
      type: 'request',
      content: `New exchange request for your listing`,
      link: `/requests/${docRef.id}`,
      listingId,
      requesterId,
    });
    await sendPushNotification(ownerId, 'New exchange request', 'You received a new request.', `/requests/${docRef.id}`);
    await sendEmailNotification(ownerId, 'New exchange request', 'You have a new exchange request on your listing.');
  } catch (e) {
    console.warn('Failed to send notifications for owner', e);
  }
    res.json({ id: docRef.id });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Reschedule an existing service exchange request by updating its proposedTime.
 *
 * Route params:
 *   - id: the request document ID
 * Body:
 *   - proposedTime: ISO string or timestamp for the new proposed time
 *
 * The authenticated user must have an active membership. For consistency with
 * other booking actions we enforce the same guard used for creation
 * (canCreateBooking). If membership is inactive or the plan limit is exceeded,
 * respond with 403 so the client can redirect to pricing.
 */
export async function rescheduleRequest(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user;
    if (!authUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const requesterId: string = authUser.uid;
    const requestId: string = (req.params as any).id;
    const { proposedTime } = req.body || {};
    if (!requestId) {
      res.status(400).json({ error: 'Missing request id' });
      return;
    }
    if (!proposedTime) {
      res.status(400).json({ error: 'Missing proposedTime' });
      return;
    }
    // Enforce membership guard (active + quota as per creation guard)
    const userSnap = await getUserDocument(requesterId);
    const membership = userSnap.get('membership');
    // Require active membership at minimum; also reuse plan booking quota guard
    const check = canCreateBooking(membership);
    if (!check.allowed) {
      res.status(403).json({ error: check.reason });
      return;
    }
    const reqRef = admin.firestore().collection('requests').doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const data = snap.data() || {};
    // Ensure the authenticated user is either the requester or owner
    const ownerId: string | undefined = (data as any).ownerId;
    const existingRequesterId: string | undefined = (data as any).requesterId;
    if (existingRequesterId !== requesterId && ownerId !== requesterId) {
      res.status(403).json({ error: 'Not authorized to modify this request' });
      return;
    }
    await reqRef.update({ proposedTime: new Date(proposedTime) });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
