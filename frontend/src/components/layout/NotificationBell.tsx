'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BellIcon, Loader2, XIcon } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/firebase';
import { markNotificationsRead } from '@/services/api';
import { formatNotificationTime, normalizeNotificationLink } from '@/lib/notifications';
import type { Notification } from '@/types';

export function NotificationBell() {
  const { user } = useAuth();
  if (!user) return null;
  return <NotificationInboxBell key={user.uid} userId={user.uid} />;
}

function NotificationInboxBell({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(Boolean(db));
  const [error, setError] = useState<string | null>(null);
  const unreadIds = useMemo(() => notifications.filter((item) => !item.isRead).map((item) => item.id), [notifications]);

  useEffect(() => {
    if (!db) return;
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(20),
    );
    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(snapshot.docs.map((item) => {
          const data = item.data() as Record<string, unknown>;
          return {
            id: item.id,
            type: ['review', 'message', 'request', 'system'].includes(String(data.type))
              ? data.type as Notification['type']
              : 'system',
            content: typeof data.content === 'string' ? data.content : '',
            date: data.date as Notification['date'],
            isRead: data.isRead === true,
            userId,
            link: normalizeNotificationLink(data.link),
          };
        }));
        setError(null);
        setLoading(false);
      },
      () => {
        setNotifications([]);
        setError(t('profile.notifications.loadFailed', { defaultValue: 'Notifications could not be loaded. Please try again.' }));
        setLoading(false);
      },
    );
  }, [t, userId]);

  useEffect(() => {
    if (!open || unreadIds.length === 0) return;
    const ids = [...unreadIds];
    markNotificationsRead(ids)
      .then(() => setNotifications((items) => items.map((item) => ids.includes(item.id) ? { ...item, isRead: true } : item)))
      .catch(() => {
        // Keep unread state authoritative when the ownership-checked request fails.
      });
  }, [open, unreadIds]);

  const visibleError = db ? error : t('profile.notifications.loadFailed', { defaultValue: 'Notifications could not be loaded. Please try again.' });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('header.notifications', 'Notifications')}>
          <BellIcon className="h-4 w-4" aria-hidden="true" />
          {unreadIds.length > 0 ? (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
              {unreadIds.length > 99 ? '99+' : unreadIds.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="z-[100] w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">{t('header.notifications', 'Notifications')}</p>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} aria-label={t('common.close', 'Close')}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto p-3">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading')}
            </div>
          ) : visibleError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{visibleError}</div>
          ) : notifications.length === 0 ? (
            <div className="min-h-32 py-8 text-center text-sm text-muted-foreground">
              {t('profile.notifications.emptyBody', { defaultValue: 'You have no notifications yet.' })}
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((item) => {
                const content = (
                  <>
                    <p className="text-sm text-foreground">{item.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNotificationTime(item.date, t('profile.notifications.recent'))}</p>
                  </>
                );
                return (
                  <li key={item.id} className={`rounded-lg border px-3 py-2 ${item.isRead ? 'bg-card' : 'bg-primary/5'}`}>
                    {item.link ? <Link href={item.link} onClick={() => setOpen(false)}>{content}</Link> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/profile?tab=notifications">{t('profile.yourNotifications', 'View all notifications')}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
