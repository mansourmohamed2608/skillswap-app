import React from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useIncomingRequests, useOutgoingRequests, useScheduledRequests, type BookingRequest } from '@/services/bookings';
import { formatDistanceToNow } from 'date-fns';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';

function BookingItem({ r }: { r: BookingRequest }) {
  const { t } = useTranslation();
  const when = r.proposedTime
    ? formatDistanceToNow(new Date(r.proposedTime), { addSuffix: true })
    : 'TBD';
  return (
    <Link href={`/bookings/${r.id}`} asChild>
      <View style={cn('mb-3 rounded-md border border-border bg-card p-3')}>
        <View style={cn('flex-row items-center justify-between')}>
          <Text style={cn('font-semibold text-foreground')}>{r.status.toUpperCase()}</Text>
          {r.createdAt && (
            <Text style={cn('text-xs text-muted-foreground')}>
              {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
            </Text>
          )}
        </View>
        <Text style={cn('mt-1 text-sm text-muted-foreground')}>
          {t('bookings.listingItem', { id: r.listingId })}
        </Text>
        <Text style={cn('text-sm text-muted-foreground')}>
          {t('bookings.whenItem', { when })}
        </Text>
        {r.message ? <Text style={cn('mt-1 text-sm')}>"{r.message}"</Text> : null}
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
