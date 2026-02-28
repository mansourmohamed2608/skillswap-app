
"use client";
// src/app/wishes/donate/page.tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { db } from "@/services/firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { donateToWishPublic, mockCompletePaymentPublic } from "@/services/api";
import { getFeaturedWishes, type WishSummary } from "@/services/data";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { getWishPublicId } from "@/lib/public-ids";

function DonatePageContent() {
  const params = useSearchParams();
  const wishIdentifier = params.get('wish') || params.get('id') || '';
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [wish, setWish] = useState<any>(null);
  const [availableWishes, setAvailableWishes] = useState<WishSummary[]>([]);
  const [loadingWishes, setLoadingWishes] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedWishId, setResolvedWishId] = useState('');
  const isOwner = Boolean(user?.uid && wish?.userId && user.uid === wish.userId);

  useEffect(() => {
    (async () => {
      if (!wishIdentifier || !db) {
        setWish(null);
        setResolvedWishId('');
        return;
      }
      let resolvedId = wishIdentifier;
      let snap = await getDoc(doc(db, 'wishes', resolvedId));
      if (!snap.exists()) {
        const sample = await getDocs(query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(200)));
        const match = sample.docs.find((d) => {
          const data: any = d.data() || {};
          return wishIdentifier === String(data.publicId || '') || wishIdentifier === getWishPublicId({
            id: d.id,
            title: data.title,
            publicId: data.publicId || null,
          });
        });
        if (match) {
          resolvedId = match.id;
          snap = match;
        }
      }
      if (snap.exists()) {
        const nextWish = { id: snap.id, ...snap.data() } as any;
        const publicId = getWishPublicId({
          id: snap.id,
          title: nextWish?.title,
          publicId: nextWish?.publicId || null,
        });
        setResolvedWishId(resolvedId);
        setWish(nextWish);
        if (wishIdentifier !== publicId || !params.get('wish')) {
          router.replace(`/wishes/donate?wish=${encodeURIComponent(publicId)}`);
        }
      }
    })();
  }, [wishIdentifier, params, router]);

  useEffect(() => {
    if (wishIdentifier) return;
    let mounted = true;
    (async () => {
      setLoadingWishes(true);
      try {
        const data = await getFeaturedWishes({ count: 6 });
        if (mounted) setAvailableWishes(data);
      } finally {
        if (mounted) setLoadingWishes(false);
      }
    })();
    return () => { mounted = false; };
  }, [wishIdentifier]);

  const base = process.env.NEXT_PUBLIC_FUNCTIONS_BASE || `http://127.0.0.1:5001/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/us-central1`;
  const useMockPayments = process.env.NEXT_PUBLIC_USE_MOCK_PAYMENTS === 'true';

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <Heart className="mx-auto h-12 w-12 text-accent mb-4" />
          <CardTitle className="text-3xl font-bold text-primary">{t('wishes.donate.title')}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {t('wishes.donate.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {wish ? (
            <div className="space-y-3">
              {wish.imageUrl ? (
                <div className="relative h-44 w-full overflow-hidden rounded-md border">
                  <Image src={wish.imageUrl} alt={wish.title || "wish"} fill style={{ objectFit: "cover" }} />
                </div>
              ) : null}
              {wish.videoUrl ? (
                <div className="w-full overflow-hidden rounded-md border">
                  <video className="w-full max-h-[320px] object-cover" src={wish.videoUrl} controls preload="metadata" />
                </div>
              ) : null}
              <div className="text-center">
                <div className="text-xl font-semibold">{wish.title}</div>
                <div className="text-muted-foreground">{t('wishes.donate.goalLabel', { amount: wish.goalAmount, currency: wish.currency || 'EGP' })}</div>
              </div>
              <Progress value={Math.min(100, Math.round(((wish.totalDonated || 0) / (wish.goalAmount || 1)) * 100))} />
              <div className="text-center text-sm text-muted-foreground">
                {t('wishes.donate.raised', { raised: wish.totalDonated || 0, goal: wish.goalAmount, currency: wish.currency || 'EGP' })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">{t('wishes.donate.selectPrompt')}</p>
              {loadingWishes ? (
                <p className="text-center text-muted-foreground">{t('wishes.list.loading')}</p>
              ) : availableWishes.length > 0 ? (
                <div className="grid gap-3">
                  {availableWishes.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border bg-card p-3 gap-3">
                      <div>
                        <div className="font-medium">{item.title || t('wishes.donate.fallbackTitle')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('wishes.list.raised', { raised: item.totalDonated || 0, goal: item.goalAmount || 0, currency: item.currency || 'EGP' })}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/wishes/donate?wish=${encodeURIComponent(item.publicId || item.id)}`)}
                      >
                        {t('wishes.donate.selectWish')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">{t('wishes.donate.noneAvailable')}</p>
              )}
            </div>
          )}

          {isOwner ? (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertDescription className="text-amber-800">
                You cannot donate to your own wish.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('wishes.donate.amountLabel', { currency: wish?.currency || 'EGP' })}</Label>
            <Input id="amount" type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder={t('wishes.donate.amountPlaceholder')} />
          </div>
          {!anonymous && (
            <div className="space-y-2">
              <Label htmlFor="name">{t('wishes.donate.nameLabel')}</Label>
              <Input id="name" value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder={t('wishes.donate.namePlaceholder')} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('wishes.donate.emailLabel')}</Label>
            <Input id="email" type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="flex items-center gap-2">
            <input id="anon" type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <Label htmlFor="anon">{t('wishes.donate.anonymousLabel')}</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={!resolvedWishId || submitting || isOwner} onClick={async () => {
            if (!resolvedWishId) return;
            if (isOwner) {
              toast({ title: "You cannot donate to your own wish.", variant: 'destructive' });
              return;
            }
            if (!(amount > 0) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
              toast({ title: t('wishes.detail.invalidInput'), variant: 'destructive' });
              return;
            }
            if (!anonymous && !donorName.trim()) {
              toast({ title: t('wishes.donate.nameRequired'), variant: 'destructive' });
              return;
            }
            setSubmitting(true);
            try {
              const { paymentUrl } = await donateToWishPublic(base, resolvedWishId, { amount, donorEmail, donorName: anonymous ? undefined : donorName.trim(), anonymous });
              if (useMockPayments && paymentUrl.includes('mock.local')) {
                const match = /sessionId=([^&]+)/.exec(paymentUrl);
                if (match?.[1]) {
                  await mockCompletePaymentPublic(match[1], base);
                  toast({ title: t('wishes.donate.thanks') });
                } else {
                  toast({ title: t('wishes.donate.donateFailed'), variant: 'destructive' });
                }
              } else {
                window.location.href = paymentUrl;
              }
            } catch (e: any) {
              toast({
                title: t('wishes.donate.donateFailed'),
                description: getErrorMessage(e, t('wishes.donate.donateFailed')),
                variant: 'destructive'
              });
            } finally {
              setSubmitting(false);
            }
          }} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6">
            <Heart className="mr-2 h-5 w-5" />
            {submitting ? t('wishes.donate.processing') : t('wishes.donate.proceed')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <DonatePageContent />
    </Suspense>
  );
}
