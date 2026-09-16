import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';

/**
 * Mobile membership hook aligned with the web version.
 * Exposes active state, plan, and basic quota checks for listings/bookings/messages.
 */
export function useMembership() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!db || !user) { setMembership(null); setLoading(false); return; }
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const m = data.membership;
      if (m?.endDate instanceof Timestamp) m.endDate = m.endDate.toDate();
      setMembership(m || null);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const active = !!membership?.active && membership?.endDate && new Date(membership.endDate).getTime() > Date.now();
  const plan: string = active ? membership?.plan || 'Free' : 'Free';
  const listingCount: number = membership?.listingCount ?? 0;
  const bookingCount: number = membership?.bookingCount ?? 0;
  const messageCount: number = membership?.messageCount ?? 0;

  const listingLimit = plan === 'Free' ? 1 : plan === 'Basic' ? 9 : plan === 'Standard' ? 12 : Number.POSITIVE_INFINITY;
  const bookingLimit = plan === 'Basic' ? 9 : plan === 'Standard' ? 12 : Number.POSITIVE_INFINITY;
  const messageLimit = plan === 'Basic' ? 9 : plan === 'Standard' ? 12 : Number.POSITIVE_INFINITY;

  const canCreateListing = listingCount < listingLimit;
  const canCreateBooking = active && bookingCount < bookingLimit;
  const canSendMessage = active && messageCount < messageLimit;

  return {
    membership,
    active,
    plan,
    loading,
    // quotas
    listingLimit,
    bookingLimit,
    messageLimit,
    listingCount,
    bookingCount,
    messageCount,
    canCreateListing,
    canCreateBooking,
    canSendMessage,
  };
}
