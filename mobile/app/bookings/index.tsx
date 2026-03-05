import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useIncomingRequests, useOutgoingRequests, useScheduledRequests, type BookingRequest } from '@/services/bookings';
import { getListingById } from '@/services/data';
import { formatDistanceToNow } from 'date-fns';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';

function BookingItem({ r }: { r: BookingRequest }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState<string>('');
  const when = r.proposedTime
    ? formatDistanceToNow(new Date(r.proposedTime), { addSuffix: true })
    : 'TBD';
  const statusColor =
    r.status === 'ACCEPTED' ? 'green' :
    r.status === 'REJECTED' || r.status === 'CANCELLED' ? 'red' :
    r.status === 'PENDING' ? 'yellow' : 'gray';

  useEffect(() => {
    if (!r.listingId) return;
    getListingById(r.listingId).then((l) => {
      if (l) {
        const v = l as any;
        setTitle(v.offeredService?.title || v.title || '');
      }
    });
  }, [r.listingId]);

  return (
    <Link href={`/bookings/${r.id}`} asChild>
      <View style={cn('mb-3 rounded-md border border-border bg-card p-3')}>
        <View style={cn('flex-row items-center justify-between mb-1')}>
          <Text style={cn('font-semibold text-foreground flex-1 mr-2')} numberOfLines={1}>
            {title || t('bookings.listingFallback')}
          </Text>
          {r.createdAt && (
            <Text style={cn('text-xs text-muted-foreground')}>
              {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
            </Text>
          )}
        </View>
        <View style={cn('flex-row items-center gap-2')}>
          <Text style={[
            cn('text-xs font-medium px-2 py-0.5 rounded-full'),
            {
              backgroundColor: statusColor === 'green' ? '#dcfce7' : statusColor === 'red' ? '#fee2e2' : statusColor === 'yellow' ? '#fef9c3' : '#f3f4f6',
              color: statusColor === 'green' ? '#166534' : statusColor === 'red' ? '#991b1b' : statusColor === 'yellow' ? '#854d0e' : '#6b7280',
            },
          ]}>
            {r.status.toUpperCase()}
          </Text>
        </View>
        {r.proposedTime ? (
          <Text style={cn('text-xs text-muted-foreground mt-1')}>{t('bookings.whenItem', { when })}</Text>
        ) : null}
        {r.message ? <Text style={cn('mt-1 text-xs text-muted-foreground')} numberOfLines={1}>"{r.message}"</Text> : null}
      </View>
    </Link>
  );
}

export default function BookingsListScreen() {
  const { t } = useTranslation();
  const incoming = useIncomingRequests();
  const outgoing = useOutgoingRequests();
  const scheduled = useScheduledRequests();
  const { setFade } = useHeaderFade();

  return (
    <View style={cn('flex-1 bg-background')}>
      <ScrollView
        style={cn('flex-1')}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        <View style={cn('px-4 py-6 gap-4')}>
          <Text style={cn('text-2xl font-bold text-foreground')}>{t('bookings.title')}</Text>
          <Card>
            <CardHeader>
              <CardTitle>{t('bookings.yourBookings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                tabs={[
                  {
                    id: 'incoming',
                    label: t('bookings.incoming'),
                    content: (
                      <View>
                        {incoming.length === 0 ? (
                          <Text style={cn('text-muted-foreground')}>
                            {t('bookings.emptyIncoming')}
                          </Text>
                        ) : (
                          incoming.map((r) => <BookingItem key={r.id} r={r} />)
                        )}
                      </View>
                    ),
                  },
                  {
                    id: 'outgoing',
                    label: t('bookings.outgoing'),
                    content: (
                      <View>
                        {outgoing.length === 0 ? (
                          <Text style={cn('text-muted-foreground')}>
                            {t('bookings.emptyOutgoing')}
                          </Text>
                        ) : (
                          outgoing.map((r) => <BookingItem key={r.id} r={r} />)
                        )}
                      </View>
                    ),
                  },
                  {
                    id: 'scheduled',
                    label: t('bookings.scheduled'),
                    content: (
                      <View>
                        {scheduled.length === 0 ? (
                          <Text style={cn('text-muted-foreground')}>
                            {t('bookings.emptyScheduled')}
                          </Text>
                        ) : (
                          scheduled.map((r) => <BookingItem key={r.id} r={r} />)
                        )}
                      </View>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <View style={cn('flex-row justify-between items-center')}>
            <Link href="/">
              <Text style={cn('text-primary')}>{t('nav.home')}</Text>
            </Link>
            <Link href="/listings">
              <Text style={cn('text-primary')}>{t('bookings.browseListing')}</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
