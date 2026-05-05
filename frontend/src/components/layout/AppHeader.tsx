
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MenuIcon, HomeIcon, ListIcon, UserIcon, SparklesIcon, MessageCircle, CalendarDays, LogInIcon, UserPlusIcon, LogOutIcon, GemIcon, BellIcon, Star, MessageSquare, Briefcase, Info, CheckCheck, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth, db } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getUnreadConversationCount, useConversationsRTDB } from '@/services/chatRTDB';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { clearReadNotifications, markNotificationsRead } from '@/services/api';
import { GlobalSearchBar } from '@/features/home/components/GlobalSearchBar';

// Public links, always visible
const publicNavItems = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/listings', label: 'Listings', icon: ListIcon },
  { href: '/matchmaking', label: 'AI Matchmaking', icon: SparklesIcon },
  { href: '/pricing', label: 'Subscription Plans', icon: GemIcon },
];

// Links for authenticated users
const privateNavItems = [
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

// Links for unauthenticated users
const authNavItems = [
  { href: '/auth/signin', label: 'Sign In', icon: LogInIcon },
  { href: '/auth/signup', label: 'Sign Up', icon: UserPlusIcon },
];


const AppLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7 text-primary"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/>
    <path d="m18 2 4 4-4 4"/>
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22"/>
    <path d="m18 22 4-4-4-4"/>
  </svg>
);

function SignOutButton({ isMobile = false, onDone, iconOnly = false }: { isMobile?: boolean; onDone?: () => void; iconOnly?: boolean }) {
    const router = useRouter();
    const { t } = useTranslation();
    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
        }
        onDone?.();
        router.push('/');
    };

  return (
    <Button
      variant="ghost"
      size={iconOnly ? "icon" : "default"}
      onClick={handleSignOut}
      className={isMobile ? "justify-start text-base py-3 w-full" : iconOnly ? "relative" : "w-auto"}
      aria-label={iconOnly ? t('header.signOut') : undefined}
    >
      <LogOutIcon className={isMobile ? "h-5 w-5 mr-3" : "h-4 w-4"} />
      {!iconOnly ? t('header.signOut') : <span className="sr-only">{t('header.signOut')}</span>}
    </Button>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isAuthenticated = !!user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopNotificationsOpen, setDesktopNotificationsOpen] = useState(false);
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const conversations = useConversationsRTDB();
  const unreadChats = getUnreadConversationCount(conversations, user?.uid);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readNotifications = useMemo(() => notifications.filter((n) => n.isRead), [notifications]);
  const previewNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);
  const notificationIcon = (type: Notification['type']) => {
    if (type === 'review') return <Star className="h-4 w-4 text-amber-500" />;
    if (type === 'message') return <MessageSquare className="h-4 w-4 text-sky-500" />;
    if (type === 'request') return <Briefcase className="h-4 w-4 text-primary" />;
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  useEffect(() => {
    // Only set up listener if db and user are available
    if (!db || !user?.uid) {
      return;
    }
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
    if (!desktopNotificationsOpen && !mobileNotificationsOpen) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;

    // Mark notifications as read asynchronously via API
    markNotificationsRead(unreadIds).then(() => {
      setNotifications((prev) => prev.map((item) => (
        unreadIds.includes(item.id) ? { ...item, isRead: true } : item
      )));
    }).catch(() => {
      // On error, don't update state since the API call failed
    });
  }, [desktopNotificationsOpen, mobileNotificationsOpen, notifications]);

  const notificationTimeLabel = (n: Notification) => {
    try {
      return formatDistanceToNow(new Date(n.date), { addSuffix: true });
    } catch {
      return t('profile.notifications.recent');
    }
  };

  const markAllVisibleAsRead = () => {
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

  const labelFor = (href: string, fallback: string) => {
    const map: Record<string, string> = {
      '/': 'home',
      '/listings': 'listings',
      '/matchmaking': 'matchmaking',
      '/pricing': 'pricing',
      '/bookings': 'bookings',
      '/chat': 'chat',
      '/profile': 'profile',
      '/auth/signin': 'signIn',
      '/auth/signup': 'signUp',
    };
    const key = map[href];
    return key ? t(`header.${key}`) : fallback;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 md:justify-start">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 text-primary transition-colors hover:text-primary/80">
          <AppLogo />
          <span
            className={`truncate font-bold text-lg sm:text-xl ${i18n.dir() === 'rtl' ? 'hidden sm:inline max-w-[7rem] sm:max-w-none' : 'max-w-[8rem] sm:max-w-none'}`}
          >
            {t('common.appName')}
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center md:flex px-8">
          <div className="w-full max-w-md">
            <GlobalSearchBar />
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav className="flex items-center gap-0.5">
            {publicNavItems.map((item) => (
              <Button key={item.label} variant="ghost" asChild>
                <Link href={item.href} className="flex items-center gap-2 px-3">
                  <item.icon className="h-4 w-4" />
                  {labelFor(item.href, item.label)}
                </Link>
              </Button>
            ))}
            {isAuthenticated ? (
              <Button variant="ghost" asChild>
                <Link href="/bookings" className="flex items-center gap-2 px-3">
                  <CalendarDays className="h-4 w-4" />
                  {labelFor('/bookings', 'Bookings')}
                </Link>
              </Button>
            ) : null}
          </nav>
        </div>

        <div className="hidden shrink-0 items-center justify-end gap-1 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <Popover open={desktopNotificationsOpen} onOpenChange={setDesktopNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={t('header.notifications')}>
                    <BellIcon className="h-4 w-4" />
                    <span className="sr-only">{t('header.notifications')}</span>
                    {unreadNotifications > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[22rem] p-0">
                  <div className="border-b px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{t('header.notifications')}</p>
                        <p className="text-xs text-muted-foreground">
                          {unreadNotifications > 0
                            ? t('profile.notifications.unreadCount', { count: unreadNotifications })
                            : t('profile.notifications.recent')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDesktopNotificationsOpen(false)}
                        aria-label={t('common.close', { defaultValue: 'Close' })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={markAllVisibleAsRead} disabled={unreadNotifications === 0}>
                        <CheckCheck className="mr-1 h-4 w-4" />
                        Mark all read
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearRead} disabled={readNotifications.length === 0}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Clear read
                      </Button>
                    </div>
                  </div>
                  {previewNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t('profile.notifications.emptyBody')}
                    </div>
                  ) : (
                    <ul className="max-h-[22rem] overflow-y-auto">
                      {previewNotifications.map((notification) => {
                        const content = (
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">{notificationIcon(notification.type)}</span>
                            <span className="min-w-0">
                              <p className="line-clamp-2 text-sm text-foreground">{notification.content}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{notificationTimeLabel(notification)}</p>
                            </span>
                          </div>
                        );
                        const rowClass = `block px-4 py-3 text-left transition-colors hover:bg-muted/50 ${notification.isRead ? 'bg-card/70' : 'bg-muted/30'}`;
                        if (notification.link) {
                          return (
                            <li key={notification.id}>
                              <Link href={notification.link} className={rowClass} onClick={() => setDesktopNotificationsOpen(false)}>
                                {content}
                              </Link>
                            </li>
                          );
                        }
                        return (
                          <li key={notification.id} className={rowClass}>
                            {content}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/chat" className="flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                  <span className="sr-only">{t('header.chat')}</span>
                  {unreadChats > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
                      {unreadChats > 99 ? '99+' : unreadChats}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile" className="flex items-center justify-center">
                  <UserIcon className="h-4 w-4" />
                  <span className="sr-only">{t('header.profile')}</span>
                </Link>
              </Button>
              <div className="mx-1 h-5 w-px bg-border/60" />
              <LanguageSwitcher compact />
              <SignOutButton iconOnly />
            </div>
          ) : (
            <>
              {authNavItems.map((item) => (
                <Button key={item.label} variant="ghost" asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {labelFor(item.href, item.label)}
                  </Link>
                </Button>
              ))}
              <LanguageSwitcher compact />
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 md:hidden">
          {isAuthenticated ? (
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link href="/chat">
                <MessageCircle className="h-5 w-5" />
                <span className="sr-only">{t('header.chat')}</span>
                {unreadChats > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {unreadChats > 9 ? '9+' : unreadChats}
                  </span>
                ) : null}
              </Link>
            </Button>
          ) : null}
          {isAuthenticated ? (
            <Popover open={mobileNotificationsOpen} onOpenChange={setMobileNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={t('header.notifications')}>
                  <BellIcon className="h-5 w-5" />
                  <span className="sr-only">{t('header.notifications')}</span>
                  {unreadNotifications > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[20rem] p-0">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{t('header.notifications')}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setMobileNotificationsOpen(false)}
                      aria-label={t('common.close', { defaultValue: 'Close' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={markAllVisibleAsRead} disabled={unreadNotifications === 0}>
                      <CheckCheck className="mr-1 h-4 w-4" />
                      Mark all read
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearRead} disabled={readNotifications.length === 0}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Clear read
                    </Button>
                  </div>
                </div>
                {previewNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t('profile.notifications.emptyBody')}
                  </div>
                ) : (
                  <ul className="max-h-[18rem] overflow-y-auto">
                    {previewNotifications.map((notification) => (
                      <li key={notification.id} className={`px-4 py-3 ${notification.isRead ? 'bg-card/70' : 'bg-muted/30'}`}>
                        {notification.link ? (
                          <Link href={notification.link} onClick={() => setMobileNotificationsOpen(false)} className="block">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5">{notificationIcon(notification.type)}</span>
                              <span className="min-w-0">
                                <p className="line-clamp-2 text-sm text-foreground">{notification.content}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{notificationTimeLabel(notification)}</p>
                              </span>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">{notificationIcon(notification.type)}</span>
                            <span className="min-w-0">
                              <p className="line-clamp-2 text-sm text-foreground">{notification.content}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{notificationTimeLabel(notification)}</p>
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          ) : null}
          <div className="shrink-0">
            <LanguageSwitcher compact />
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} className="w-[88vw] max-w-sm overflow-y-auto">
              <div className="mt-6 flex items-center justify-between border-b pb-4">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-primary">
                  <AppLogo />
                  <span className="font-bold text-lg">{t('common.appName')}</span>
                </Link>
                <LanguageSwitcher compact />
              </div>
              <div className="mt-6 flex flex-col gap-1">
                {publicNavItems.map((item) => (
                  <Button key={`mobile-${item.href}`} variant="ghost" asChild className="justify-start text-base">
                    <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {labelFor(item.href, item.label)}
                    </Link>
                  </Button>
                ))}
                {isAuthenticated ? (
                  <>
                    {privateNavItems.filter(item => item.href !== '/chat').map((item) => (
                      <Button key={`mobile-${item.href}`} variant="ghost" asChild className="justify-start text-base">
                        <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                            {labelFor(item.href, item.label)}
                          </span>
                          {item.href === '/chat' && unreadChats > 0 ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
                              {unreadChats > 99 ? '99+' : unreadChats}
                            </span>
                          ) : null}
                        </Link>
                      </Button>
                    ))}
                    <SignOutButton isMobile onDone={() => setMobileOpen(false)} />
                  </>
                ) : (
                  authNavItems.map((item) => (
                    <Button key={`mobile-${item.href}`} variant="ghost" asChild className="justify-start text-base">
                      <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {labelFor(item.href, item.label)}
                      </Link>
                    </Button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
