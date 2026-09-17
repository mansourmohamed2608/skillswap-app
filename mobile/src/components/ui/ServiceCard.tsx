import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RepeatIcon, CalendarIcon, MapPinIcon, Clock3Icon, CheckCircle2Icon } from 'lucide-react-native';
import type { ServiceListing, User } from '@/types';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { CategoryPill } from './CategoryPill';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { fetchListingRequestState, type ListingRequestState } from '@/services/api';

export interface ServiceCardProps {
  listing: ServiceListing;
  user?: User | null;
}

export function ServiceCard({ listing, user }: ServiceCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const isOwner = Boolean(authUser?.uid && authUser.uid === listing.offeredByUserId);
  const [requestState, setRequestState] = useState<ListingRequestState>({ state: 'none' });
  const [resolvedRequestStateKey, setResolvedRequestStateKey] = useState('');
  const requestStateKey = authUser?.uid ? `${listing.id}:${authUser.uid}` : '';
  const requestStateLoading = Boolean(requestStateKey && !isOwner && resolvedRequestStateKey !== requestStateKey);

  useEffect(() => {
    let mounted = true;
    if (!authUser?.uid || isOwner) {
      setRequestState({ state: isOwner ? 'owner' : 'none' });
      setResolvedRequestStateKey('');
      return () => { mounted = false; };
    }
    const lookupKey = `${listing.id}:${authUser.uid}`;
    setResolvedRequestStateKey('');
    fetchListingRequestState(listing.id)
      .then((next) => {
        if (mounted) setRequestState(next);
      })
      .catch(() => {
        if (mounted) setRequestState({ state: 'none' });
      })
      .finally(() => {
        if (mounted) setResolvedRequestStateKey(lookupKey);
      });
    return () => { mounted = false; };
  }, [authUser?.uid, isOwner, listing.id]);

  const getStatusBadgeVariant = (status: ServiceListing['status']): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'open': return 'default';
      case 'pending_exchange': return 'outline';
      case 'completed': return 'secondary';
      default: return 'destructive';
    }
  };

  const getStatusText = (status: ServiceListing['status']) => {
    switch (status) {
      case 'open': return t('listings.card.status.open') || 'Open for Exchange';
      case 'pending_exchange': return t('listings.card.status.pending') || 'Pending Exchange';
      case 'completed': return t('listings.card.status.completed') || 'Completed';
      case 'cancelled': return t('listings.card.status.cancelled') || 'Cancelled';
      case 'removed': return t('listings.card.status.cancelled') || 'Removed';
      default: return status;
    }
  };

  const postedAt = formatDistanceToNow(new Date(listing.postedDate), { addSuffix: true });
  const exchangeLabel = listing.requestedKind === 'money'
    ? (t('listings.card.paymentRequested') || 'Payment Requested:')
    : listing.requestedKind === 'product'
      ? (t('listings.card.productRequested') || 'Product Requested:')
      : (t('listings.card.exchangeFor') || 'In Exchange For:');

  const openRequestFlow = () => {
    if (!authUser) {
      router.push('/auth/signin');
      return;
    }
    if (requestState.state === 'pending' || requestState.state === 'accepted') {
      const requestId = requestState.publicId || requestState.requestId;
      if (requestId) router.push(`/bookings/${requestId}` as any);
      return;
    }
    router.push(`/listings/${listing.id}?request=1` as any);
  };

  const requestLabel = requestState.state === 'accepted'
    ? (t('listings.request_connected') || 'Connected')
    : requestState.state === 'pending'
      ? (t('listings.request_pending') || 'Request Pending')
      : (t('listings.request_exchange') || 'Request Exchange');

  return (
      <View style={cn('mb-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm')}>
        {/* Image */}
        {listing.offeredService?.imageUrl && (
          <View style={cn('relative h-48 w-full overflow-hidden')}>
            <Image
              source={{ uri: listing.offeredService.imageUrl }}
              style={cn('h-full w-full') as any}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Content */}
        <View style={cn('p-4')}>
          {/* Category and Status */}
          <View style={cn('mb-2 flex-row items-center justify-between')}>
            <CategoryPill category={listing.offeredService?.category ?? 'General'} />
            <Badge variant={getStatusBadgeVariant(listing.status)}>
              {getStatusText(listing.status)}
            </Badge>
          </View>

          {/* Title */}
          <Text style={cn('mb-1 text-lg font-semibold text-foreground')} numberOfLines={2}>
            {listing.offeredService?.title ?? 'Untitled'}
          </Text>

          {/* Description */}
          <Text style={cn('mb-2 text-sm text-muted-foreground')} numberOfLines={2}>
            {listing.offeredService?.description ?? ''}
          </Text>

          {/* Exchange Icon */}
          <View style={cn('my-3 items-center')}>
            <RepeatIcon size={24} color="#4f7942" />
          </View>

          {/* Requested Service */}
          <Text style={cn('mb-1 text-sm font-semibold text-foreground')}>{exchangeLabel}</Text>
          <Text style={cn('mb-1 font-medium text-primary')} numberOfLines={1}>
            {listing.requestedService?.title ?? 'Open to offers'}
          </Text>
          <CategoryPill category={listing.requestedService?.category ?? 'General'} className="mb-2" />
          <Text style={cn('text-xs text-muted-foreground')} numberOfLines={2}>
            {listing.requestedService?.description ?? ''}
          </Text>
        </View>

        {/* Footer */}
        <View style={cn('border-t border-border p-4')}>
          <View style={cn('flex-row items-center justify-between')}>
            {/* User Info */}
            {user && (
              <View style={cn('flex-row items-center gap-2')}>
                <Avatar
                  source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
                  fallback={user.name}
                  size="sm"
                />
                <View>
                  <Text style={cn('text-sm font-medium text-foreground')}>{user.name}</Text>
                  {user.location && (
                    <View style={cn('flex-row items-center gap-1')}>
                      <MapPinIcon size={12} color="#666" />
                      <Text style={cn('text-xs text-muted-foreground')}>{user.location}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Date */}
            <View style={cn('flex-row items-center gap-1')}>
              <CalendarIcon size={12} color="#666" />
              <Text style={cn('text-xs text-muted-foreground')}>{postedAt}</Text>
            </View>
          </View>
          <View style={cn('mt-3 flex-row gap-2')}>
            {!isOwner ? (
              <TouchableOpacity
                onPress={openRequestFlow}
                disabled={requestStateLoading}
                style={cn(`min-h-11 flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-primary px-2 ${requestStateLoading ? 'opacity-60' : ''}`)}
                accessibilityRole="button"
                accessibilityLabel={requestLabel}
              >
                {requestState.state === 'accepted' ? (
                  <CheckCircle2Icon size={16} color="#4f7942" />
                ) : requestState.state === 'pending' ? (
                  <Clock3Icon size={16} color="#4f7942" />
                ) : null}
                <Text style={cn('text-center text-xs font-semibold text-primary')} numberOfLines={2}>{requestLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push(`/listings/${listing.id}` as any)}
              style={cn('min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-2')}
              accessibilityRole="button"
              accessibilityLabel={t('listings.view_details') || 'View Details'}
            >
              <Text style={cn('text-center text-xs font-semibold text-primary-foreground')}>
                {t('listings.view_details') || 'View Details'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
  );
}

export default ServiceCard;
