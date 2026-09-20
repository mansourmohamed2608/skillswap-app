import { db } from "@/services/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type Plan = "Free" | "Basic" | "Standard" | "Pro" | "Business";

export function useMembership() {
  const { user } = useAuth();
  const [snapshotState, setSnapshotState] = useState<{ uid: string; membership: any | null; error: string | null }>({
    uid: '', membership: null, error: null,
  });

  useEffect(() => {
    if (!db || !user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const m = data.membership;
      // normalize endDate (Timestamp -> Date)
      if (m?.endDate instanceof Timestamp) m.endDate = m.endDate.toDate();
      setSnapshotState({ uid: user.uid, membership: m || null, error: null });
    }, () => setSnapshotState({ uid: user.uid, membership: null, error: 'MEMBERSHIP_LOAD_FAILED' }));
    return () => unsub();
  }, [user]);

  const isCurrentAccountState = Boolean(user && snapshotState.uid === user.uid);
  const membership = isCurrentAccountState ? snapshotState.membership : null;
  const loading = Boolean(user && db && !isCurrentAccountState);
  const error = user && !db
    ? 'MEMBERSHIP_LOAD_FAILED'
    : isCurrentAccountState ? snapshotState.error : null;

  const nowRef = useRef(0);
  // eslint-disable-next-line react-hooks/purity
  if (!nowRef.current) nowRef.current = Date.now();
  const active = useMemo(() =>
    !!membership?.active &&
    membership?.endDate &&
    new Date(membership.endDate).getTime() > nowRef.current,
  [membership]);

  const paidPlan: Plan | undefined = active && ['Basic', 'Standard', 'Pro', 'Business'].includes(membership?.plan)
    ? membership?.plan
    : undefined;
  const plan: Plan = paidPlan || "Free";
  const listingCount: number = membership?.listingCount ?? 0;
  const bookingCount: number = membership?.bookingCount ?? 0;
  const messageCount: number = membership?.messageCount ?? 0;

  const planLimit =
    plan === "Free" ? 0 :
    plan === "Basic" ? 9 :
    plan === "Standard" ? 12 :
    Number.POSITIVE_INFINITY;

  const canCreateListing = active && plan !== 'Free' && listingCount < planLimit;

  const bookingLimit =
    plan === "Basic" ? 9 :
    plan === "Standard" ? 12 :
    Number.POSITIVE_INFINITY;
  const messageLimit =
    plan === "Basic" ? 9 :
    plan === "Standard" ? 12 :
    Number.POSITIVE_INFINITY;

  const canCreateBooking = active && bookingCount < bookingLimit;
  const canSendMessage = active && messageCount < messageLimit;

  return {
    membership,
    error,
    plan,
    active,
    loading,
    // listings
    canCreateListing,
    planLimit,
    listingCount,
    // bookings
    canCreateBooking,
    bookingLimit,
    bookingCount,
    // messages
    canSendMessage,
    messageLimit,
    messageCount,
  };
}
