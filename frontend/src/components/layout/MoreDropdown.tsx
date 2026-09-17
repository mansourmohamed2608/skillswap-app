'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BellIcon,
  GemIcon,
  X as XIcon,
  CheckCheck as CheckCheckIcon,
  Trash2 as Trash2Icon,
  MenuIcon,
  LogOut,
  SettingsIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { clearReadNotifications, markNotificationsRead } from '@/services/api';

export function MoreDropdown() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = !!user;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleDropdownOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      setNotificationsOpen(false);
    }
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setNotificationsOpen(open);
    if (open) {
      setDropdownOpen(false);
    }
  };

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readNotifications = useMemo(() => notifications.filter((n) => n.isRead), [notifications]);
  const previewNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  const notificationIcon = (type: Notification['type']) => {
    if (type === 'review') return '⭐';
    if (type === 'message') return '💬';
    if (type === 'request') return '💼';
    return 'ℹ️';
  };

  useEffect(() => {
    if (!db || !user?.uid) return;
    const qy = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(qy, (snap) => {
      const items = snap.docs.map((d) => {
        const data: any = d.data();
        let dateIso: string;
        const dt = data.date;
        try {
          if (dt && typeof dt.toDate === 'function') dateIso = dt.toDate().toISOString();
          else if (typeof dt === 'string') dateIso = new Date(dt).toISOString();
          else if (dt instanceof Date) dateIso = dt.toISOString();
          else dateIso = new Date().toISOString();
        } catch {
          dateIso = new Date().toISOString();
        }
        return {
          id: d.id,
          type: data.type || 'system',
          content: data.content || '',
          date: dateIso,
          isRead: !!data.isRead,
          link: data.link,
          userId: data.userId,
        } as Notification;
      });
      setNotifications(items);
    }, () => {
      setNotifications([]);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    markNotificationsRead(unreadIds).then(() => {
      setNotifications((prev) => prev.map((item) => (
        unreadIds.includes(item.id) ? { ...item, isRead: true } : item
      )));
    }).catch(() => {
      // On error, do not mutate state.
    });
  }, [notificationsOpen, notifications]);

  const markAllAsRead = () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((item) => (
      unreadIds.includes(item.id) ? { ...item, isRead: true } : item
    )));
    markNotificationsRead(unreadIds).catch(() => {
      setNotifications((prev) => prev.map((item) => (
        unreadIds.includes(item.id) ? { ...item, isRead: false } : item
      )));
    });
  };

  const clearRead = () => {
    const readIds = readNotifications.map((n) => n.id);
    if (!readIds.length) return;
    const previous = notifications;
    setNotifications((prev) => prev.filter((item) => !item.isRead));
    clearReadNotifications(readIds).catch(() => {
      setNotifications(previous);
    });
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    setDropdownOpen(false);
    setNotificationsOpen(false);
    router.push('/');
  };

  const notificationTimeLabel = (n: Notification) => {
    try {
      return formatDistanceToNow(new Date(n.date), { addSuffix: true });
    } catch {
      return t('profile.notifications.recent');
    }
  };

  const notificationsContent = (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          disabled={unreadNotifications === 0}
          className="flex-1"
        >
          <CheckCheckIcon className="mr-1 h-3 w-3" />
          Mark all read
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRead}
          disabled={readNotifications.length === 0}
          className="flex-1"
        >
          <Trash2Icon className="mr-1 h-3 w-3" />
          Clear read
        </Button>
      </div>
      {previewNotifications.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {t('profile.notifications.emptyBody')}
        </div>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {previewNotifications.map((notif) => (
            <li key={notif.id} className={`px-3 py-2 text-xs rounded-md border ${notif.isRead ? 'bg-muted/30' : 'bg-accent/10'}`}>
              <p className="line-clamp-3">{notificationIcon(notif.type)} {notif.content}</p>
              <p className="text-muted-foreground text-xs mt-1">{notificationTimeLabel(notif)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <>
      {isAuthenticated && (
        <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden md:inline-flex"
              aria-label={t('header.notifications', 'Notifications')}
            >
              <BellIcon className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] px-1 py-0.5">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-80 md:w-96 p-0 z-50"
          >
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{t('header.notifications')}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setNotificationsOpen(false)}
                aria-label={t('common.close', 'Close')}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-4">
              {notificationsContent}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Popover open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('header.burger', 'Menu')}>
            <MenuIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-0">
          <div className="p-4 border-b flex flex-col gap-3">
            <Button variant="ghost" size="sm" className="justify-start gap-2 w-full" asChild>
              <Link href="/pricing" onClick={() => setDropdownOpen(false)}>
                <GemIcon className="h-4 w-4" />
                {t('header.pricing', 'Subscription Plans')}
              </Link>
            </Button>

            {isAuthenticated && (
              <>
                <Button variant="ghost" size="sm" className="justify-start gap-2 w-full" asChild>
                  <Link href="/settings" onClick={() => setDropdownOpen(false)}>
                    <SettingsIcon className="h-4 w-4" />
                    {t('nav.mobile.settings', 'Settings')}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 w-full"
                  onClick={handleSignOut}
                  aria-label={t('header.logout', 'Logout')}
                >
                  <LogOut className="h-4 w-4" />
                  {t('header.logout', 'Logout')}
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
