'use client';

// src/app/wishes/page.tsx
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/services/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getWishPath } from '@/lib/public-ids';
import { WishMediaGallery } from '@/components/wishes/WishMediaGallery';

type WishSummary = {
  id: string;
  publicId?: string | null;
  userId?: string;
  title?: string;
  description?: string;
  totalDonated?: number;
  goalAmount?: number;
  currency?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export default function WishesListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [wishes, setWishes] = useState<WishSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!db) {
          if (mounted) setWishes([]);
          return;
        }
        const q = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            publicId: data.publicId || null,
            userId: data.userId,
            title: data.title,
            description: data.description,
            totalDonated: data.totalDonated,
            goalAmount: data.goalAmount,
            currency: data.currency,
            imageUrl: data.imageUrl || null,
            videoUrl: data.videoUrl || null,
          } as WishSummary;
        });
        if (mounted) setWishes(items);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto py-8 text-center text-muted-foreground">{t('wishes.list.loading')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 grid gap-4">
      {wishes.length === 0 ? (
        <div className="text-center text-muted-foreground">{t('wishes.list.empty')}</div>
      ) : wishes.map((w) => {
        const raised = Number(w.totalDonated || 0);
        const goal = Number(w.goalAmount || 1);
        const pct = Math.min(100, Math.round((raised / goal) * 100));
        const currency = w.currency || 'EGP';
        const isOwner = Boolean(user?.uid && w.userId && user.uid === w.userId);
        return (
          <Card key={w.id} className="shadow-sm overflow-hidden">
            <div className="border-b bg-muted/10 p-3">
              <WishMediaGallery title={w.title} imageUrl={w.imageUrl} videoUrl={w.videoUrl} compact />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{w.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground line-clamp-3">{w.description}</p>
              <Progress value={pct} />
              <div className="text-sm text-muted-foreground">
                {t('wishes.list.raised', { raised, goal, currency })}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Link href={getWishPath(w)} className="w-full">
                <Button variant="outline" className="w-full">{t('home.wishes.viewDetails')}</Button>
              </Link>
              {isOwner ? (
                <Button className="w-full" disabled>
                  Your wish
                </Button>
              ) : (
                <Link href={`/wishes/donate?wish=${encodeURIComponent(w.publicId || w.id)}`} className="w-full">
                  <Button className="w-full">{t('wishes.list.donate')}</Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
