'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BellIcon, GemIcon, X, CheckCheck, Trash2, MenuIcon, LogOut } from 'lucide-react';
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

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readNotifications = useMemo(() => notifications.filter((n) => n.isRead), [notifications]);
  const previewNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  // Notification icon based on type
  const notificationIcon = (type: Notification['type']) => {
    if (type === 'review') return '⭐';
    if (type === 'message') return '💬';
    if (type === 'request') return '💼';
    return 'ℹ️';
  };

  // Fetch notifications
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

  // Mark unread as read when opening
  useEffect(() => {
    if (!notificationsOpen) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    markNotificationsRead(unreadIds).then(() => {
      setNotifications((prev) => prev.map((item) => (
        unreadIds.includes(item.id) ? { ...item, isRead: true } : item
      )));
    }).catch(() => {
      // On error, don't update state
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
    router.push('/');
  };

  const notificationTimeLabel = (n: Notification) => {
    try {
      return formatDistanceToNow(new Date(n.date), { addSuffix: true });
    } catch {
      return t('profile.notifications.recent');
    }
  };

  return (
    <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <MenuIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <div className="p-4 border-b flex flex-col gap-3">
          {/* Notifications (when authenticated) */}
          {isAuthenticated && (
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 relative w-full text-left"
                  aria-label={t('header.notifications')}
                >
                  <BellIcon className="h-4 w-4" />
                  <span className="flex-1">{t('header.notifications')}</span>
                  {unreadNotifications > 0 && (
                    <span className="text-xs bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-80 p-0">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold">{t('header.notifications')}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={unreadNotifications === 0}
                    >
                      <CheckCheck className="mr-1 h-3 w-3" />
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRead}
                      disabled={readNotifications.length === 0}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Clear read
                    </Button>
                  </div>
                </div>
                {previewNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t('profile.notifications.emptyBody')}
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {previewNotifications.map((notif) => (
                      <li key={notif.id} className={`px-4 py-2 text-xs border-b last:border-b-0 ${notif.isRead ? 'bg-muted/30' : 'bg-accent/10'}`}>
                        <p className="line-clamp-2">{notificationIcon(notif.type)} {notif.content}</p>
                        <p className="text-muted-foreground text-xs mt-1">{notificationTimeLabel(notif)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Subscription Plans */}
          <Button variant="ghost" size="sm" className="justify-start gap-2 w-full" asChild>
            <Link href="/pricing" onClick={() => setDropdownOpen(false)}>
              <GemIcon className="h-4 w-4" />
              {t('header.pricing', 'Subscription Plans')}
            </Link>
          </Button>

          {isAuthenticated && (
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
