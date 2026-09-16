import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import type { Notification } from '@/types';
import { formatNotificationTime } from '@/lib/notifications';

export interface NotificationListProps {
  notifications: Notification[];
}

export default function NotificationList({ notifications }: NotificationListProps) {
  const safeNotifications = useMemo(
    () => Array.isArray(notifications) ? notifications : [],
    [notifications],
  );
  const times = useMemo(() => {
    const t: Record<string, string> = {};
    safeNotifications.forEach((n) => {
      t[n.id] = formatNotificationTime(n.date, 'Recently');
    });
    return t;
  }, [safeNotifications]);

  if (safeNotifications.length === 0) {
    return (
      <View style={cn('items-center py-8')}>
        <Text style={cn('text-muted-foreground')}>No notifications yet</Text>
      </View>
    );
  }

  return (
    <View>
      {safeNotifications.map((n) => (
        <View key={n.id} style={cn('flex-row items-center gap-3 py-3 border-b border-border')}>
          <Avatar size="md" fallback={(n.userId || 'N').slice(0,1).toUpperCase()} />
          <View style={{ flex: 1 }}>
            <Text style={cn('text-foreground')}>{n.content}</Text>
            <Text style={cn('text-xs text-muted-foreground mt-1')}>{times[n.id] || 'Recently'}</Text>
          </View>
          {!n.isRead && <View style={cn('h-2 w-2 rounded-full bg-accent')} />}
        </View>
      ))}
    </View>
  );
}
