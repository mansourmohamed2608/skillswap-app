import React from 'react';
import { View, Text, Image, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Link } from 'expo-router';
import { RepeatIcon, CalendarIcon, MapPinIcon } from 'lucide-react-native';
import type { ServiceListing, User } from '@/types';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { CategoryPill } from './CategoryPill';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/cn';

export interface ServiceCardProps extends TouchableOpacityProps {
  listing: ServiceListing;
  user?: User | null;
}

export function ServiceCard({ listing, user, ...props }: ServiceCardProps) {
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
      case 'open': return 'Open for Exchange';
      case 'pending_exchange': return 'Pending Exchange';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const postedAt = formatDistanceToNow(new Date(listing.postedDate), { addSuffix: true });

  return (
    <Link href={`/listings/${listing.id}`} asChild>
      <TouchableOpacity 
        style={cn('mb-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm active:opacity-80')}
        {...props}
      >
        {/* Image */}
        {listing.offeredService?.imageUrl && (
          <View style={cn('relative h-48 w-full')}>
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
          <Text style={cn('mb-1 text-sm font-semibold text-foreground')}>In Exchange For:</Text>
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
        </View>
      </TouchableOpacity>
    </Link>
  );
}

export default ServiceCard;
