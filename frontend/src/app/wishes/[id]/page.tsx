"use client";
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/services/firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { donateToWishPublic, getFunctionsBase, mockCompletePaymentPublic, submitReport } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getWishPath, matchesWishPublicId } from '@/lib/public-ids';
import { WishMediaGallery } from '@/components/wishes/WishMediaGallery';

export default function WishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [wish, setWish] = useState<any>();
  const [resolvedWishId, setResolvedWishId] = useState<string>('');
  const [donors, setDonors] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const isOwner = Boolean(user?.uid && wish?.userId && user.uid === wish.userId);

  async function loadRecentDonors(targetWishId: string) {
    const wishId = String(targetWishId || '').trim();
    if (!wishId) {
      setDonors([]);
      return;
    }
    try {
      const base = getFunctionsBase();
      const res = await fetch(`${base}/api/wishes/${encodeURIComponent(wishId)}/donors?limit=5`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        setDonors([]);
        return;
      }
      const data: any = await res.json().catch(() => null);
      setDonors(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setDonors([]);
    }
  }

  useEffect(() => {
    (async () => {
      if (!id || !db) return;
      let resolvedId = id;
      let snap = await getDoc(doc(db, 'wishes', resolvedId));
      if (!snap.exists()) {
        const sample = await getDocs(query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(200)));
        const match = sample.docs.find((d) => matchesWishPublicId(id, {
          id: d.id,
          title: (d.data() as any)?.title,
          publicId: (d.data() as any)?.publicId || null,
        }));
        if (match) {
          resolvedId = match.id;
          snap = match;
        }
      }
      if (snap.exists()) {
        setResolvedWishId(resolvedId);
        const nextWish = { id: snap.id, ...snap.data() } as any;
        setWish(nextWish);
        const canonicalPath = getWishPath({
          id: snap.id,
          title: nextWish?.title,
          publicId: nextWish?.publicId || null,
        });
        if (canonicalPath !== `/wishes/${encodeURIComponent(id)}`) {
          router.replace(canonicalPath);
        }
      }
      await loadRecentDonors(resolvedId);
    })();
  }, [id, router]);

  const pct = useMemo(() => {
    const raised = Number(wish?.totalDonated || 0);
    const goal = Number(wish?.goalAmount || 1);
    return Math.min(100, Math.round((raised / goal) * 100));
  }, [wish]);

  const deadlineLabel = useMemo(() => {
    const raw = wish?.deadline;
    if (!raw) return null;
    try {
      const date = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  }, [wish]);

  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || `http://127.0.0.1:5001/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/us-central1`;
  const useMockPayments = process.env.NEXT_PUBLIC_USE_MOCK_PAYMENTS === 'true';

  async function onDonate() {
    if (!resolvedWishId) return;
    if (isOwner) {
      toast({ title: 'You cannot donate to your own wish.', variant: 'destructive' });
      return;
    }
    if (!(amount > 0) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
      toast({ title: t('wishes.detail.invalidInput'), variant: 'destructive' });
      return;
    }
    if (!anonymous && !donorName.trim()) {
      toast({ title: t('wishes.detail.nameRequired'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { paymentUrl } = await donateToWishPublic(base, resolvedWishId, { amount, donorEmail, donorName: anonymous ? undefined : donorName.trim(), anonymous });
      if (useMockPayments && paymentUrl.includes('mock.local')) {
        const match = /sessionId=([^&]+)/.exec(paymentUrl);
        if (!match?.[1]) {
          throw new Error(t('wishes.detail.donateFailed'));
        }
        await mockCompletePaymentPublic(match[1], base);
        toast({ title: t('wishes.detail.thanks') });
        if (db) {
          const snap = await getDoc(doc(db, 'wishes', resolvedWishId));
          if (snap.exists()) setWish({ id: snap.id, ...snap.data() });
          await loadRecentDonors(resolvedWishId);
        }
      } else {
        window.location.href = paymentUrl;
      }
    } catch (e: any) {
      toast({
        title: t('wishes.detail.donateFailed'),
        description: getErrorMessage(e, t('wishes.detail.donateFailed')),
        variant: 'destructive'
      });
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitReport() {
    if (isOwner) {
      toast({ title: t('reports.ownerBlocked'), variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: t('reports.signInRequired'), variant: 'destructive' });
      return;
    }
    if (!reportReason.trim()) {
      toast({ title: t('reports.missingReason'), variant: 'destructive' });
      return;
    }
    setReportBusy(true);
    try {
      await submitReport({
        type: 'wish',
        contentId: resolvedWishId || id,
        reason: reportReason.trim(),
        note: reportNote.trim() || undefined,
      });
      toast({ title: t('reports.submitted') });
      setReportReason('');
      setReportNote('');
      setReportOpen(false);
    } catch (e: any) {
      toast({
        title: t('reports.failed'),
        description: getErrorMessage(e, t('reports.failed')),
        variant: 'destructive'
      });
    } finally {
      setReportBusy(false);
    }
  }

  if (!id) return <div className="p-6 text-center text-muted-foreground">{t('wishes.detail.missingId')}</div>;
  if (!wish) return <div className="p-6 text-center text-muted-foreground">{t('wishes.detail.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{wish.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WishMediaGallery title={wish.title} imageUrl={wish.imageUrl} videoUrl={wish.videoUrl} />
          <p className="text-muted-foreground whitespace-pre-line">{wish.description}</p>
          {(wish.category || deadlineLabel) && (
            <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
              {wish.category && <span>{t('wishes.detail.category', { category: wish.category })}</span>}
              {deadlineLabel && <span>{t('wishes.detail.deadline', { date: deadlineLabel })}</span>}
            </div>
          )}
          <Progress value={pct} />
          <div className="text-sm text-muted-foreground">
            {t('wishes.detail.raised', { raised: Number(wish.totalDonated || 0), goal: Number(wish.goalAmount || 0), currency: wish.currency || 'EGP' })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('wishes.detail.donorsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {donors.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('wishes.detail.donorsEmpty')}</div>
          ) : donors.map(d => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span>{d.anonymous ? t('wishes.detail.anonymous') : (d.donorName || t('wishes.detail.donorFallback'))}</span>
              <span>{d.amount} {d.currency || wish.currency || 'EGP'}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('wishes.detail.donateTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOwner ? (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertDescription className="text-amber-800">
                You cannot donate to your own wish.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="amt">{t('wishes.detail.amountLabel', { currency: wish.currency || 'EGP' })}</Label>
            <Input id="amt" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="em">{t('wishes.detail.emailLabel')}</Label>
            <Input id="em" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input id="anon" type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <Label htmlFor="anon">{t('wishes.detail.anonymousLabel')}</Label>
            </div>
          </div>
          {!anonymous && (
            <div className="space-y-1">
              <Label htmlFor="nm">{t('wishes.detail.nameLabel')}</Label>
              <Input id="nm" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button disabled={busy || isOwner} onClick={onDonate}>
            {busy ? t('wishes.detail.processing') : t('wishes.detail.donateButton')}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.reportWish')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {isOwner ? t('reports.ownerBlocked') : t('reports.reportHelp')}
          </p>
          <Button variant="outline" onClick={() => setReportOpen(true)} disabled={isOwner}>
            {t('reports.open')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reports.reportWish')}</DialogTitle>
            <DialogDescription>{t('reports.reportDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportReason">{t('reports.reasonLabel')}</Label>
              <Input
                id="reportReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t('reports.reasonPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportNote">{t('reports.noteLabel')}</Label>
              <Textarea
                id="reportNote"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder={t('reports.notePlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {t('reports.cancel')}
            </Button>
            <Button onClick={onSubmitReport} disabled={reportBusy}>
              {reportBusy ? t('reports.submitting') : t('reports.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
