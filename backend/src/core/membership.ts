import * as admin from 'firebase-admin';
import { PLAN_LISTING_LIMITS, PLAN_BOOKING_LIMITS, PLAN_MESSAGE_LIMITS, SubscriptionPlan } from './constants';

export async function getUserDocument(userId: string): Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>> {
  const snapshot = await admin.firestore().collection('users').doc(userId).get();
  if (!snapshot.exists) {
    throw new Error(`User ${userId} does not exist`);
  }
  return snapshot;
}

export function isMembershipActive(membership: any): boolean {
  if (!membership) return false;
  const raw = membership.endDate;
  let end: Date;
  try {
    if (raw && typeof (raw as any).toDate === 'function') {
      end = (raw as any).toDate();
    } else if (raw instanceof Date) {
      end = raw as Date;
    } else if (typeof raw === 'number') {
      end = new Date(raw);
    } else {
      end = new Date(raw);
    }
  } catch {
    return false;
  }
  return end.getTime() > Date.now();
}

export type ListingEligibilityCode = 'MEMBERSHIP_REQUIRED' | 'LISTING_LIMIT_REACHED';
export type UsageEligibilityCode = 'MEMBERSHIP_REQUIRED' | 'BOOKING_LIMIT_REACHED' | 'MESSAGE_LIMIT_REACHED';

export function canCreateListing(membership: any): { allowed: boolean; code?: ListingEligibilityCode; reason?: string } {
  if (!isMembershipActive(membership)) {
    return { allowed: false, code: 'MEMBERSHIP_REQUIRED', reason: 'Membership is inactive or expired.' };
  }
  const plan: SubscriptionPlan = membership.plan;
  const currentCount: number = membership.listingCount ?? 0;
  const limit = PLAN_LISTING_LIMITS[plan];
  if (limit !== Infinity && currentCount >= limit) {
    return {
      allowed: false,
      code: 'LISTING_LIMIT_REACHED',
      reason: `You have reached the maximum number of active listings (${limit}) for your ${plan} plan.`,
    };
  }
  return { allowed: true };
}

export function canCreateBooking(membership: any): { allowed: boolean; code?: UsageEligibilityCode; reason?: string } {
  if (!isMembershipActive(membership)) {
    return { allowed: false, code: 'MEMBERSHIP_REQUIRED', reason: 'Membership is inactive or expired.' };
  }
  const plan: SubscriptionPlan = membership.plan;
  const current: number = membership.bookingCount ?? 0;
  const limit = PLAN_BOOKING_LIMITS[plan];
  if (limit !== Infinity && current >= limit) {
    return { allowed: false, code: 'BOOKING_LIMIT_REACHED', reason: `You have reached the maximum number of bookings (${limit}) for your ${plan} plan.` };
  }
  return { allowed: true };
}

export function canSendMessage(membership: any): { allowed: boolean; code?: UsageEligibilityCode; reason?: string } {
  if (!isMembershipActive(membership)) {
    return { allowed: false, code: 'MEMBERSHIP_REQUIRED', reason: 'Membership is inactive or expired.' };
  }
  const plan: SubscriptionPlan = membership.plan;
  const current: number = membership.messageCount ?? 0;
  const limit = PLAN_MESSAGE_LIMITS[plan];
  if (limit !== Infinity && current >= limit) {
    return { allowed: false, code: 'MESSAGE_LIMIT_REACHED', reason: `You have reached the maximum number of messages (${limit}) for your ${plan} plan.` };
  }
  return { allowed: true };
}

export async function incrementListingCount(userId: string): Promise<void> {
  const userRef = admin.firestore().collection('users').doc(userId);
  await admin.firestore().runTransaction(async (txn) => {
    const doc = await txn.get(userRef);
    const membership = doc.get('membership');
    if (!membership) throw new Error('No membership found for user');
    const count = membership.listingCount ?? 0;
    txn.update(userRef, { 'membership.listingCount': count + 1 });
  });
}

export async function decrementListingCount(userId: string): Promise<void> {
  const userRef = admin.firestore().collection('users').doc(userId);
  await admin.firestore().runTransaction(async (txn) => {
    const doc = await txn.get(userRef);
    const membership = doc.get('membership');
    if (!membership) throw new Error('No membership found for user');
    const count = membership.listingCount ?? 0;
    const next = Math.max(0, count - 1);
    txn.update(userRef, { 'membership.listingCount': next });
  });
}

export async function incrementBookingCount(userId: string): Promise<void> {
  const userRef = admin.firestore().collection('users').doc(userId);
  await admin.firestore().runTransaction(async (txn) => {
    const doc = await txn.get(userRef);
    const membership = doc.get('membership');
    if (!membership) throw new Error('No membership found for user');
    const count = membership.bookingCount ?? 0;
    txn.update(userRef, { 'membership.bookingCount': count + 1 });
  });
}

export async function incrementMessageCount(userId: string): Promise<void> {
  const userRef = admin.firestore().collection('users').doc(userId);
  await admin.firestore().runTransaction(async (txn) => {
    const doc = await txn.get(userRef);
    const membership = doc.get('membership');
    if (!membership) throw new Error('No membership found for user');
    const count = membership.messageCount ?? 0;
    txn.update(userRef, { 'membership.messageCount': count + 1 });
  });
}
