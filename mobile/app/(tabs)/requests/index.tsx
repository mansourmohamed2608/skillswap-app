import { View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React, { useEffect, useState } from 'react';
import { db, auth } from '@/services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Link } from 'expo-router';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Clock, Search, Filter, CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { computeFade } from '@/components/layout/constants';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { getListingById, getUserById } from '@/services/data';

interface RequestDoc {
  id: string;
  listingId: string;
  requesterId: string;
  ownerId: string;
  status?: string;
  proposedTime?: any;
  createdAt?: any;
  message?: string;
}

function getStatusBadge(status?: string, t?: (k: string) => string) {
  const label = (k: string) => t ? t(k) : k.split('.').pop() || k;
  switch (status) {
    case 'accepted':
      return <Badge variant="success"><View style={cn('flex-row items-center gap-1')}><CheckCircle size={12} color="#fff" /><Text style={cn('text-xs font-semibold text-white')}>{label('status.accepted')}</Text></View></Badge>;
    case 'rejected':
      return <Badge variant="destructive"><View style={cn('flex-row items-center gap-1')}><XCircle size={12} color="#fff" /><Text style={cn('text-xs font-semibold text-white')}>{label('status.rejected')}</Text></View></Badge>;
    case 'completed':
      return <Badge variant="default"><View style={cn('flex-row items-center gap-1')}><CheckCircle size={12} color="#fff" /><Text style={cn('text-xs font-semibold text-white')}>{label('status.completed')}</Text></View></Badge>;
    default:
      return <Badge variant="outline"><View style={cn('flex-row items-center gap-1')}><Clock size={12} color="#666" /><Text style={cn('text-xs font-semibold')}>{label('status.pending')}</Text></View></Badge>;
  }
}

function RequestItem({ item }: { item: RequestDoc }) {
  const { t } = useTranslation();
  const [listingTitle, setListingTitle] = useState('');
  const [partnerName, setPartnerName] = useState('');

  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (item.listingId) {
      getListingById(item.listingId).then((l) => {
        if (l) {
          const v = l as any;
          setListingTitle(v.offeredService?.title || v.title || '');
        }
      });
    }
    const partnerId = uid && item.requesterId === uid ? item.ownerId : item.requesterId;
    if (partnerId) {
      getUserById(partnerId).then((u) => {
        if (u) setPartnerName((u as any).name || '');
      });
    }
  }, [item.listingId, item.requesterId, item.ownerId]);

  return (
    <Link href={`/bookings/${item.id}`}>
      <View>
        <Card className="mb-3">
          <CardContent className="p-4">
            <View style={cn('mb-2 flex-row items-start justify-between')}>
              <View style={cn('flex-1 mr-2')}>
                <Text style={cn('text-base font-semibold text-foreground')} numberOfLines={1}>
                  {listingTitle || `${t('requests.exchange_id') || 'Request'} #${item.id.slice(0, 8)}`}
                </Text>
                {partnerName ? (
                  <Text style={cn('text-xs text-muted-foreground mt-0.5')}>{partnerName}</Text>
                ) : null}
              </View>
              {getStatusBadge(item.status, t)}
            </View>
            {item.message && (
              <Text style={cn('mb-2 text-sm text-muted-foreground')} numberOfLines={2}>
                {item.message}
              </Text>
            )}
            {item.proposedTime && (
              <View style={cn('mt-2 flex-row items-center gap-1')}>
                <Clock size={14} color="#666" />
                <Text style={cn('text-xs text-muted-foreground')}>
                  {format(item.proposedTime.toDate(), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
            )}
            {item.createdAt && (
              <Text style={cn('mt-2 text-xs text-muted-foreground')}>
                {t('common.created') || 'Created'}: {format(item.createdAt.toDate(), 'MMM d, yyyy')}
              </Text>
            )}
          </CardContent>
        </Card>
      </View>
    </Link>
  );
}

export default function RequestsScreen() {
  const [items, setItems] = useState<RequestDoc[]>([]);
  const [filteredItems, setFilteredItems] = useState<RequestDoc[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();
  const { setFade } = useHeaderFade();

  useEffect(() => {
    // start transparent and update via scroll
    setFade(0);
    if (!auth?.currentUser || !db) return;
    const uid = auth.currentUser.uid;
    const col = collection(db, 'requests');
    const q = query(col, where('requesterId', '==', uid));
    const q2 = query(col, where('ownerId', '==', uid));
    const unsub1 = onSnapshot(q, (snap) => {
      const a = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems((prev) => {
        const others = prev.filter((x) => x.requesterId !== uid);
        return [...others, ...a];
      });
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      const a = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems((prev) => {
        const others = prev.filter((x) => x.ownerId !== uid);
        return [...others, ...a];
      });
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    let filtered = items;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [items, statusFilter, searchQuery]);

  const statusCounts = {
    all: items.length,
    pending: items.filter(i => !i.status || i.status === 'pending').length,
    accepted: items.filter(i => i.status === 'accepted').length,
    rejected: items.filter(i => i.status === 'rejected').length,
    completed: items.filter(i => i.status === 'completed').length,
  };

  return (
    <View style={cn('flex-1 bg-background')}>
      
      <ScrollView
        style={cn('flex-1')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
  <View style={cn('px-4 py-3')}>
          <Text style={cn('mb-4 text-2xl font-bold text-foreground')}>
            {t('nav.requests') || 'Exchange Requests'}
          </Text>

          {/* Search Bar */}
          <View style={cn('mb-4 flex-row items-center rounded-lg border border-border bg-card px-3 py-2')}>
            <Search size={20} color="#666" />
            <TextInput
              style={cn('ml-2 flex-1 text-foreground')}
              placeholder={t('common.search') || 'Search requests...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          {/* Status Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cn('mb-4')}>
            <View style={cn('flex-row gap-2')}>
              {['all', 'pending', 'accepted', 'rejected', 'completed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={cn(
                    'rounded-full border px-4 py-2',
                    statusFilter === status ? 'border-primary bg-primary' : 'border-border bg-card'
                  )}
                >
                  <Text
                    style={cn(
                      'text-sm font-medium',
                      statusFilter === status ? 'text-white' : 'text-foreground'
                    )}
                  >
                    {t(`status.${status}`) || status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status as keyof typeof statusCounts]})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Requests List */}
          {filteredItems.length === 0 ? (
            <View style={cn('items-center py-12')}>
              <Package size={48} color="#ccc" />
              <Text style={cn('mt-4 text-center text-muted-foreground')}>
                {searchQuery || statusFilter !== 'all'
                  ? t('requests.no_matches') || 'No matching requests'
                  : t('requests.empty') || 'No exchange requests yet'}
              </Text>
              {!searchQuery && statusFilter === 'all' && (
                <Link href="/listings">
                  <View style={cn('mt-4 rounded-md bg-primary h-10 px-4 py-2 items-center justify-center')}>
                    <Text style={cn('text-primary-foreground font-medium')}>
                      {t('requests.browse') || 'Browse Services'}
                    </Text>
                  </View>
                </Link>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(it) => it.id}
              scrollEnabled={false}
              renderItem={({ item }) => <RequestItem item={item} />}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
