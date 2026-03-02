import { db } from "@/services/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type Plan = "Basic" | "Standard" | "Pro" | "Business";

export function useMembership() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!db || !user) { setMembership(null); setLoading(false); return; }
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const m = data.membership;
      // normalize endDate (Timestamp -> Date)
      if (m?.endDate instanceof Timestamp) m.endDate = m.endDate.toDate();
      setMembership(m || null);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const nowRef = useRef(0);
  // eslint-disable-next-line react-hooks/purity
  if (!nowRef.current) nowRef.current = Date.now();
  const active = useMemo(() =>
    !!membership?.active &&
    membership?.endDate &&
    new Date(membership.endDate).getTime() > nowRef.current,
  [membership]);

  const plan: Plan | undefined = membership?.plan;
  const listingCount: number = membership?.listingCount ?? 0;
  const bookingCount: number = membership?.bookingCount ?? 0;
  const messageCount: number = membership?.messageCount ?? 0;

  const planLimit =
    plan === "Basic" ? 9 :
    plan === "Standard" ? 12 :
    Number.POSITIVE_INFINITY;

  const canCreateListing = active && listingCount < planLimit;

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
