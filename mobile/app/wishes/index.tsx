import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { db } from '@/services/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { useTranslation } from 'react-i18next';
// @ts-ignore expo-router import
import { useRouter } from 'expo-router';

type Wish = { id: string; title: string; description?: string; totalDonated?: number; goalAmount?: number; currency?: string };

export default function WishesListScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Wish[]>([]);
  const { setFade } = useHeaderFade();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => { setFade(0); }, [setFade]);
  useEffect(() => {
    (async () => {
      try {
        if (!db) return;
        const q = query(collection(db, 'wishes'), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const rows: Wish[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setItems(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={cn('flex-1 items-center justify-center bg-background')}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={cn('flex-1 bg-background px-3 py-3')}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={cn('h-px bg-border')} />}
        renderItem={({ item }) => {
          const raised = Number(item.totalDonated || 0);
          const goal = Number(item.goalAmount || 1);
          return (
            <TouchableOpacity
              style={cn('rounded-lg border border-border bg-card p-3')}
              onPress={() => router.push(`/wishes/donate/donate?wishId=${encodeURIComponent(item.id)}` as any)}
            >
              <Text style={cn('text-base font-semibold text-foreground mb-1')}>{item.title}</Text>
              {item.description ? (
                <Text numberOfLines={2} style={cn('text-sm text-muted-foreground mb-2')}>{item.description}</Text>
              ) : null}
              <Text style={cn('text-xs text-muted-foreground')}>
                {t('wishes.list.raised', { raised, goal, currency: item.currency || 'EGP' })}
              </Text>
              <Text style={cn('mt-1 text-primary')}>{t('wishes.list.donate')}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
