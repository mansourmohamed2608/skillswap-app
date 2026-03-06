import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getListingsWithUsers } from '@/services/data';
import type { ServiceListing, User } from '@/types';
import { ServiceCard } from '@/components/ui/ServiceCard';
import Button from '@/components/ui/Button';
import { Link } from 'expo-router';
import { Search, PlusCircle } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';

type ListingWithUser = {
  listing: ServiceListing;
  user: User | null;
};

export default function ListingsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ListingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed'>('all');
  const { setFade } = useHeaderFade();

  useEffect(() => {
    setFade(0);
    (async () => {
      try {
        const res = await getListingsWithUsers();
        setItems(res);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      item.listing.offeredService?.title?.toLowerCase().includes(query) ||
      item.listing.requestedService?.title?.toLowerCase().includes(query) ||
      item.user?.name?.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === 'all' || item.listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={cn('flex-1 bg-background')}>
      <FlatList
        data={filteredItems}
        keyExtractor={(it) => it.listing.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={cn('px-0 mb-2')}>
            {/* Header and Search (moved into list header so scrolling from top triggers fade) */}
            <View style={cn('px-4 py-3 border-b border-border')}> 
              <View style={cn('mb-3 flex-row items-center justify-between')}>
                <Text style={cn('text-2xl font-bold text-foreground')}>
                  {t('nav.listings') || 'Listings'}
                </Text>
                <Link href="/listings/new">
                  <View style={cn('h-9 rounded-md bg-primary px-3 flex-row items-center gap-2')}>
                    <PlusCircle size={16} color="#fff" />
                    <Text style={cn('text-primary-foreground font-medium')}>
                      {t('listings.create') || 'Create'}
                    </Text>
                  </View>
                </Link>
              </View>
              <View style={cn('flex-row items-center rounded-lg border border-input bg-card px-3 py-2')}>
                <Search size={20} color="#666" />
                <TextInput
                  placeholder={t('common.search') || 'Search listings...'}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={cn('ml-2 flex-1 text-foreground')}
                />
              </View>
              <View style={cn('mt-2 flex-row gap-2')}>
                {(['all', 'open', 'completed'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    style={cn(`rounded-full border px-3 py-1 ${statusFilter === s ? 'border-primary bg-primary/10' : 'border-border'}`)}
                  >
                    <Text style={cn(`text-xs ${statusFilter === s ? 'text-primary font-medium' : 'text-foreground'}`)}>
                      {t(`listings.filter_${s}`) || s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={cn('py-16 items-center justify-center')}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <View style={cn('py-16 items-center justify-center px-6')}>
              <Text style={cn('mb-2 text-lg font-semibold text-foreground')}>
                {t('listings.empty_title') || 'No listings found'}
              </Text>
              <Text style={cn('mb-4 text-center text-muted-foreground')}>
                {searchQuery
                  ? t('listings.no_results') || 'Try adjusting your search'
                  : t('listings.empty_body') || 'Be the first to create a listing!'}
              </Text>
              <Link href="/listings/new">
                <View style={cn('rounded-md bg-primary h-10 px-4 py-2 items-center justify-center')}>
                  <Text style={cn('text-primary-foreground font-medium')}>
                    {t('listings.create') || 'Create Listing'}
                  </Text>
                </View>
              </Link>
            </View>
          )
        }
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <ServiceCard listing={item.listing} user={item.user} />
        )}
      />
    </View>
  );
}
