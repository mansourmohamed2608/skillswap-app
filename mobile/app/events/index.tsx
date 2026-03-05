import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { fetchEventsMobile, registerForEventMobile } from '@/services/api';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react-native';

type EventItem = {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: number;
  registrationsCount?: number;
  coverUrl?: string | null;
};

export default function EventsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { membership, active } = useMembership();
  const { setFade } = useHeaderFade();
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => { setFade(0); }, [setFade]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchEventsMobile();
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canCreate = membership?.plan === 'Business' && active;

  const formatDate = (raw: string | undefined) => {
    if (!raw) return '';
    try {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;
      return date.toLocaleString();
    } catch {
      return raw;
    }
  };

  const handleRegister = async (event: EventItem) => {
    if (!user) {
      Alert.alert(t('events.signInToRegister') || 'Sign in to register');
      return;
    }
    setRegistering(event.id);
    try {
      const res = await registerForEventMobile(event.id);
      const msgKey = res.alreadyRegistered ? 'events.alreadyRegistered' : 'events.registered';
      Alert.alert(t(msgKey) || 'Registered.');
    } catch {
      Alert.alert(t('events.registerFailed') || 'Failed to register.');
    } finally {
      setRegistering(null);
    }
  };

  return (
    <ScrollView
      style={cn('flex-1 bg-background')}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y || 0;
        setFade(computeFade(y));
      }}
      scrollEventThrottle={16}
    >
      <View style={cn('px-4 py-4')}>
        {/* Header */}
        <View style={cn('mb-4 flex-row items-start justify-between')}>
          <View style={cn('flex-1')}>
            <Text style={cn('text-2xl font-bold text-foreground')}>
              {t('events.title') || 'Community Events'}
            </Text>
            <Text style={cn('mt-1 text-sm text-muted-foreground')}>
              {t('events.subtitle') || 'Business plan members can host workshops and gatherings.'}
            </Text>
          </View>
          {canCreate && (
            <Link href="/events/new" asChild>
              <TouchableOpacity style={cn('ml-2 rounded-lg bg-primary px-3 py-2')}>
                <Text style={cn('text-sm font-medium text-primary-foreground')}>
                  {t('events.createCta') || 'Create Event'}
                </Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={cn('items-center py-12')}>
            <ActivityIndicator />
            <Text style={cn('mt-2 text-muted-foreground')}>{t('events.loading') || 'Loading events...'}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={cn('items-center py-12')}>
            <Text style={cn('text-muted-foreground')}>{t('events.empty') || 'No events yet.'}</Text>
          </View>
        ) : (
          <View style={cn('gap-4')}>
            {items.map((event) => {
              const capacity = Number(event.capacity || 0);
              const count = Number(event.registrationsCount || 0);
              const isFull = capacity > 0 && count >= capacity;
              const isRegistering = registering === event.id;

              return (
                <View
                  key={event.id}
                  style={cn('rounded-lg border border-border bg-card overflow-hidden')}
                >
                  <View style={cn('p-4')}>
                    <Text style={cn('text-lg font-semibold text-foreground')}>
                      {event.title || (t('events.untitled') || 'Untitled event')}
                    </Text>

                    {event.description ? (
                      <Text style={cn('mt-1 text-sm text-muted-foreground')} numberOfLines={3}>
                        {event.description}
                      </Text>
                    ) : null}

                    <View style={cn('mt-3 gap-2')}>
                      {event.location ? (
                        <View style={cn('flex-row items-center gap-2')}>
                          <MapPinIcon size={14} color="#666" />
                          <Text style={cn('text-sm text-muted-foreground')}>
                            {t('events.locationLabel') || 'Location:'} {event.location}
                          </Text>
                        </View>
                      ) : null}

                      {event.startsAt ? (
                        <View style={cn('flex-row items-center gap-2')}>
                          <CalendarIcon size={14} color="#666" />
                          <Text style={cn('text-sm text-muted-foreground')}>
                            {t('events.startsLabel') || 'Starts:'} {formatDate(event.startsAt)}
                          </Text>
                        </View>
                      ) : null}

                      {capacity > 0 ? (
                        <View style={cn('flex-row items-center gap-2')}>
                          <UsersIcon size={14} color="#666" />
                          <Text style={cn('text-sm text-muted-foreground')}>
                            {t('events.capacityLabel', { count, capacity }) || `Capacity: ${count} / ${capacity}`}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRegister(event)}
                      disabled={isFull || isRegistering}
                      style={cn(
                        'mt-4 rounded-lg border border-primary px-4 py-2 items-center',
                        (isFull || isRegistering) && 'opacity-50',
                      )}
                    >
                      <Text style={cn('text-sm font-medium text-primary')}>
                        {isRegistering
                          ? '...'
                          : isFull
                            ? (t('events.full') || 'Full')
                            : (user
                                ? (t('events.registerCta') || 'Register')
                                : (t('events.signInToRegister') || 'Sign in to register'))}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
