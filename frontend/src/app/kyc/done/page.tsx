"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { auth, db } from "@/services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { CheckCircle2, Clock3, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";
import { getKycApiBase } from "@/services/kyc";

type StatusKey = "approved" | "declined" | "inReview" | "pending";

function normalizeStatus(statusRaw?: string): StatusKey {
  const s = (statusRaw || "").toLowerCase();
  if (s.includes("approved") || s.includes("verified")) return "approved";
  if (s.includes("declined") || s.includes("failed") || s.includes("rejected")) return "declined";
  if (s.includes("review")) return "inReview";
  return "pending";
}

function StatusPill({ status }: { status: StatusKey }) {
  const { t } = useTranslation();
  const styles = {
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-rose-100 text-rose-700",
    inReview: "bg-amber-100 text-amber-700",
    pending: "bg-slate-100 text-slate-700",
  }[status];

  const Icon =
    status === "approved" ? CheckCircle2 : status === "declined" ? AlertCircle : Clock3;

  return (
    <span className={`inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium ${styles}`}>
      <Icon className="h-4 w-4" />
      {t(`kyc.done.status.${status}`)}
    </span>
  );
}

function KycDonePageContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const sessionIdFromQuery = searchParams.get("verificationSessionId") || undefined;
  const [liveStatus, setLiveStatus] = useState<StatusKey>("pending");
  const [uid, setUid] = useState<string | null>(null);
  const [bypassBusy, setBypassBusy] = useState(false);
  const [bypassError, setBypassError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const status = liveStatus;

  useEffect(() => {
    if (!auth || !db) return;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      if (!user || !db) {
        setLiveStatus("pending");
        return;
      }
      const kycRef = doc(db, "users", user.uid, "kyc", "status");
      const unsubKyc = onSnapshot(
        kycRef,
        (snap) => {
          const data = snap.data() as { status?: string } | undefined;
          setLiveStatus(normalizeStatus(data?.status));
        },
        () => {
          setLiveStatus("pending");
        }
      );
      return () => unsubKyc();
    });
    return () => {
      unsubAuth();
    };
  }, []);

  // One-shot decision sync in case webhooks didn't land yet
  useEffect(() => {
    const sessionId = sessionIdFromQuery;
    if (!sessionId || !auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const base = getKycApiBase();
        await fetch(
          `${base}/kyc/sync?sessionId=${encodeURIComponent(sessionId)}&uid=${encodeURIComponent(user.uid)}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch {
        // ignore sync errors; UI will keep polling
      }
    });
    return () => unsub();
  }, [sessionIdFromQuery]);

  async function handleDevBypass() {
    if (!auth) return;
    setBypassBusy(true);
    setBypassError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(t('kyc.done.errors.signInFirst'));
      const token = await user.getIdToken();
      const base = getKycApiBase();
      const resp = await fetch(`${base}/kyc/dev-verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid, vendor: user.uid }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || t('kyc.done.errors.devVerifyFailed'));
      }
    } catch (e: any) {
      setBypassError(getErrorMessage(e, t('kyc.done.errors.devVerifyFailed')));
    } finally {
      setBypassBusy(false);
    }
  }

  async function handleRetry() {
    if (!auth) return;
    setRetryBusy(true);
    setRetryError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(t('kyc.done.errors.signInFirst'));
      const token = await user.getIdToken();
      const base = getKycApiBase();
      const resp = await fetch(`${base}/didit/session`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor: user.uid }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.url) {
        throw new Error(data?.error || t('kyc.done.errors.startFailed'));
      }
      window.location.href = data.url as string;
    } catch (e: any) {
      setRetryError(getErrorMessage(e, t('kyc.done.errors.startFailed')));
    } finally {
      setRetryBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-lg border bg-card shadow-sm p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-sm font-medium text-primary">{t('kyc.done.heading')}</p>
          <h1 className="text-3xl font-semibold">{t('kyc.done.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('kyc.done.subtitle')}
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={status} />
          {!uid ? (
            <span className="text-muted-foreground">{t('kyc.done.signInPrompt')}</span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/" className="rounded bg-primary px-4 py-2 text-center text-white hover:opacity-90">
            {t('kyc.done.ctaHome')}
          </Link>
          <Link href="/listings" className="rounded border px-4 py-2 text-center hover:bg-muted">
            {t('kyc.done.ctaBrowse')}
          </Link>
          <Link href="/profile" className="rounded border px-4 py-2 text-center hover:bg-muted">
            {t('kyc.done.ctaProfile')}
          </Link>
        </div>

        {status === "declined" && uid ? (
          <div className="rounded border p-3 text-sm space-y-2">
            <div className="font-medium">{t('kyc.done.retryTitle')}</div>
            <p className="text-muted-foreground">
              {t('kyc.done.retryBody')}
            </p>
            <button
              onClick={handleRetry}
              disabled={retryBusy}
              className="rounded bg-primary px-3 py-2 text-white hover:opacity-90 disabled:opacity-60"
            >
              {retryBusy ? t('kyc.done.retryLoading') : t('kyc.done.retryButton')}
            </button>
            {retryError ? <p className="text-xs text-rose-600">{retryError}</p> : null}
          </div>
        ) : null}

        {process.env.NEXT_PUBLIC_ENABLE_DEV_KYC_BYPASS === "true" ? (
          <div className="rounded border border-dashed p-3 text-sm space-y-2">
            <div className="font-medium">{t('kyc.done.devTitle')}</div>
            <p className="text-muted-foreground">
              {t('kyc.done.devBody')}
            </p>
            <button
              onClick={handleDevBypass}
              disabled={bypassBusy}
              className="rounded bg-emerald-600 px-3 py-2 text-white hover:opacity-90 disabled:opacity-60"
            >
              {bypassBusy ? t('kyc.done.devLoading') : t('kyc.done.devButton')}
            </button>
            {bypassError ? <p className="text-xs text-rose-600">{bypassError}</p> : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {t('kyc.done.footerNote')}
        </p>
      </div>
    </main>
  );
}

export default function KycDonePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <KycDonePageContent />
    </Suspense>
  );
}
