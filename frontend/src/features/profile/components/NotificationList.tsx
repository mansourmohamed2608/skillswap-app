
'use client';

import type { Notification } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { BellIcon, Star, MessageSquare, Briefcase, Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNotificationTime, normalizeNotificationLink } from '@/lib/notifications';

interface NotificationListProps {
  notifications: Notification[];
}

const iconMap = {
  review: <Star className="h-5 w-5 text-accent" />,
  message: <MessageSquare className="h-5 w-5 text-blue-500" />,
  request: <Briefcase className="h-5 w-5 text-primary" />,
  system: <Info className="h-5 w-5 text-muted-foreground" />,
};

export function NotificationList({ notifications }: NotificationListProps) {
  const { t } = useTranslation();
  const notificationTimes = useMemo<Record<string, string>>(() => {
    const times: Record<string, string> = {};
    notifications.forEach(n => {
      times[n.id] = formatNotificationTime(n.date, t('profile.notifications.recent'));
    });
    return times;
  }, [notifications, t]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <BellIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-xl font-semibold">{t('profile.notifications.emptyTitle')}</h3>
        <p className="mt-1 text-muted-foreground">{t('profile.notifications.emptyBody')}</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{t('profile.tabs.notifications')}</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? t('profile.notifications.unreadCount', { count: unreadCount })
                : t('profile.notifications.recent')}
            </p>
          </div>
          <div className="inline-flex w-fit rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {t('profile.notifications.itemCount', { count: notifications.length })}
          </div>
        </div>
        <ul className="divide-y divide-border">
          {notifications.map((notification) => {
            const safeLink = normalizeNotificationLink(notification.link);
            const icon = iconMap[notification.type] || iconMap.system;
            const content = (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                    {icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground break-words">{notification.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notificationTimes[notification.id] || t('profile.notifications.recent')}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0 pt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-accent flex" />
                  </div>
                )}
              </div>
            );

            return (
              <li
                key={notification.id}
                className={cn(
                  'p-4 transition-colors sm:p-5',
                  notification.isRead ? 'bg-card/60' : 'bg-muted/40',
                  safeLink && 'hover:bg-muted/50'
                )}
              >
                {safeLink ? (
                  <Link href={safeLink} className="block break-words">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
