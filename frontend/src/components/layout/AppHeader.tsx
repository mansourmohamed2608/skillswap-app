
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MenuIcon,
  HomeIcon,
  ListIcon,
  UserIcon,
  SparklesIcon,
  MessageCircle,
  CalendarDays,
  BellIcon,
  LogInIcon,
  UserPlusIcon,
  LogOutIcon,
  ChevronDown,
  Layers3,
  X as XIcon,
  CheckCheck as CheckCheckIcon,
  Trash2 as Trash2Icon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { markNotificationsRead, clearReadNotifications } from '@/services/api';
import { GlobalSearchBar } from '@/features/home/components/GlobalSearchBar';
import { MoreDropdown } from '@/components/layout/MoreDropdown';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { usePathname } from 'next/navigation';
import { marketplaceCategories } from '@/features/home/constants/categoryLinks';

// Primary nav items (visible on desktop)
const primaryNavItems = [
  { href: '/', label: 'home', icon: HomeIcon },
  { href: '/listings', label: 'listings', icon: ListIcon },
  { href: '/matchmaking', label: 'matchmaking', icon: SparklesIcon },
];

// Authenticated user items
const privateNavItems = [
  { href: '/bookings', label: 'bookings', icon: CalendarDays },
  { href: '/chat', label: 'chat', icon: MessageCircle },
  { href: '/profile', label: 'profile', icon: UserIcon },
];

// Unauthenticated user items
const authNavItems = [
  { href: '/auth/signin', label: 'signIn', icon: LogInIcon },
  { href: '/auth/signup', label: 'signUp', icon: UserPlusIcon },
];


const AppLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6 text-primary"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" />
    <path d="m18 22 4-4-4-4" />
  </svg>
);

function SignOutButton({
  isMobile = false,
  onDone,
}: {
  isMobile?: boolean;
  onDone?: () => void;
}) {
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
      size={isMobile ? 'default' : 'icon'}
      onClick={handleSignOut}
      className={isMobile ? 'justify-start text-base py-3 w-full gap-2 h-11' : ''}
      aria-label={t('header.signOut', 'Sign Out')}
    >
      <LogOutIcon className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
      {isMobile && <span>{t('header.signOut', 'Sign Out')}</span>}
    </Button>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSearchPage = pathname?.startsWith('/search');
  const mobileNotificationsHref = isAuthenticated ? '/profile?tab=notifications' : '/auth/signin';
  const [notifications, setNotifications] = useState([] as any[]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const previewNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  // Subscribe to notifications for mobile popover
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
        };
      });
      setNotifications(items as any[]);
    }, () => setNotifications([]));
    return () => unsub();
  }, [user?.uid]);

  return (
    <>
      <header className="sticky top-0 z-[70] w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          {/* Desktop Header Layout */}
          <div className="hidden h-16 items-center gap-2 md:flex">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 text-primary hover:text-primary/80 transition-colors">
              <AppLogo />
              <span className="font-bold text-lg">{t('common.appName')}</span>
            </Link>

            {/* Primary Navigation */}
            <nav className="ml-2 flex items-center gap-0.5">
              {primaryNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-sm"
                  title={t(`header.${item.label}`, { defaultValue: item.label.charAt(0).toUpperCase() + item.label.slice(1) })}
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{t(`header.${item.label}`, { defaultValue: item.label.charAt(0).toUpperCase() + item.label.slice(1) })}</span>
                  </Link>
                </Button>
              ))}
            </nav>

            {/* Search Bar - Desktop (centered flex-1) */}
            {!isSearchPage ? (
              <div className="mx-2 flex-1 max-w-md">
                <GlobalSearchBar />
              </div>
            ) : (
              <div className="mx-2 flex-1" aria-hidden="true" />
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isAuthenticated ? (
                <>
                  {/* Bookings (primary) */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.bookings', 'Bookings')}>
                    <Link href="/bookings" title={t('header.bookings', 'Bookings')}>
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>

                  {/* Chat */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.chat', 'Chat')}>
                    <Link href="/chat" title={t('header.chat', 'Chat')}>
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>

                  {/* Profile */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.profile', 'Profile')}>
                    <Link href="/profile" title={t('header.profile', 'Profile')}>
                      <UserIcon className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t('header.categories', 'Categories')}>
                        <Layers3 className="h-4 w-4" aria-hidden="true" />
                        <span>{t('header.categories', 'Categories')}</span>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[100] w-56">
                      {marketplaceCategories.map((category) => (
                        <DropdownMenuItem key={category.id} asChild>
                          <Link href={`/listings?category=${encodeURIComponent(category.name)}`}>
                            {category.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Language Toggle - Visible in desktop */}
                  <div className="border-l border-border/40 ml-1 pl-1">
                    <LanguageSwitcher compact />
                  </div>

                  {/* Menu Button (burger icon only) */}
                  <MoreDropdown />
                </>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t('header.categories', 'Categories')}>
                        <Layers3 className="h-4 w-4" aria-hidden="true" />
                        <span>{t('header.categories', 'Categories')}</span>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[100] w-56">
                      {marketplaceCategories.map((category) => (
                        <DropdownMenuItem key={category.id} asChild>
                          <Link href={`/listings?category=${encodeURIComponent(category.name)}`}>
                            {category.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="border-l border-border/40 ml-1 pl-1">
                    <LanguageSwitcher compact />
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/signin" className="flex items-center gap-2">
                      <LogInIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('header.signIn', 'Sign In')}</span>
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/auth/signup" className="flex items-center gap-2">
                      <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('header.signUp', 'Sign Up')}</span>
                    </Link>
                  </Button>
                  <MoreDropdown />
                </>
              )}
            </div>
          </div>

          {/* Mobile Header Layout - Two Row */}
          <div className="md:hidden">
            {/* Top Row: Logo + Menu */}
            <div className="flex h-14 items-center justify-between gap-2">
              <Link href="/" className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                <AppLogo />
                <span className="font-bold text-sm">{t('common.appName')}</span>
              </Link>

              <div className="flex items-center gap-1">
                <LanguageSwitcher compact />

                {/* Categories icon (mobile) - handled by popover below */}

                {/* Mobile notifications popover (mirrors desktop) */}
                <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t('header.notifications', 'Notifications')} className="relative">
                      <BellIcon className="h-4 w-4" aria-hidden="true" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] px-1 py-0.5">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" align="start" className="z-[110] w-80 p-0 mt-2">
                    <div className="border-b px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold">{t('header.notifications')}</p>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNotificationsOpen(false)}>
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={async () => {
                          const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
                          if (!unreadIds.length) return;
                          setNotifications((prev) => prev.map((item) => (unreadIds.includes(item.id) ? { ...item, isRead: true } : item)));
                          try { await markNotificationsRead(unreadIds); } catch { /* ignore */ }
                        }} disabled={unreadNotifications === 0}>
                          <CheckCheckIcon className="mr-1 h-3 w-3" />{t('profile.notifications.markAll', 'Mark all read')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          const readIds = notifications.filter((n) => n.isRead).map((n) => n.id);
                          if (!readIds.length) return;
                          const previous = notifications;
                          setNotifications((prev) => prev.filter((item) => !item.isRead));
                          try { await clearReadNotifications(readIds); } catch { setNotifications(previous); }
                        }} disabled={notifications.filter((n) => n.isRead).length === 0}>
                          <Trash2Icon className="mr-1 h-3 w-3" />{t('profile.notifications.clearRead', 'Clear read')}
                        </Button>
                      </div>
                    </div>
                    {previewNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('profile.notifications.emptyBody')}</div>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {previewNotifications.map((notif: any) => (
                          <li key={notif.id} className={`px-4 py-2 text-xs border-b last:border-b-0 ${notif.isRead ? 'bg-muted/30' : 'bg-accent/10'}`}>
                            <p className="line-clamp-2">{notif.content}</p>
                            <p className="text-muted-foreground text-xs mt-1">{new Date(notif.date).toLocaleString()}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Categories popover (mobile) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t('header.categories', 'Categories')}>
                      <Layers3 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="z-[110] w-56 p-0">
                    <div className="space-y-1 p-2">
                      {marketplaceCategories.map((category) => (
                        <Link key={category.id} href={`/listings?category=${encodeURIComponent(category.name)}`} className="block px-3 py-2 text-sm rounded hover:bg-muted">
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Menu Button (hamburger only) */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('header.burger', 'Menu')}
                    >
                      <MenuIcon className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>

                  {/* Mobile Menu Content */}
                  <SheetContent
                    side={i18n.dir() === 'rtl' ? 'left' : 'right'}
                    className="z-[90] w-[82vw] max-w-[360px] p-0"
                  >
                    <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-4">
                    {/* Primary Nav */}
                    {primaryNavItems.map((item) => (
                      <Button
                        key={item.href}
                        variant="ghost"
                        asChild
                        className="justify-start text-base gap-2 h-11"
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                          {t(`header.${item.label}`, { defaultValue: item.label.charAt(0).toUpperCase() + item.label.slice(1) })}
                        </Link>
                      </Button>
                    ))}

                    {/* Categories removed from sidebar per request */}

                    {/* Auth or Authenticated Section */}
                    {isAuthenticated ? (
                      <>
                        {/* Private Nav */}
                        {privateNavItems.map((item) => (
                          <Button
                            key={item.href}
                            variant="ghost"
                            asChild
                            className="justify-start text-base gap-2 h-11"
                          >
                            <Link
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon className="h-5 w-5" aria-hidden="true" />
                              {t(`header.${item.label}`, { defaultValue: item.label.charAt(0).toUpperCase() + item.label.slice(1) })}
                            </Link>
                          </Button>
                        ))}

                        {/* Divider */}
                        <div className="my-3 h-px bg-border" />

                        {/* Secondary Items Section */}
                        <div className="space-y-2">
                          {/* Subscription Plans */}
                          <Button
                            variant="ghost"
                            asChild
                            className="justify-start text-base gap-2 h-11"
                          >
                            <Link
                              href="/pricing"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <span>💎</span>
                              {t('header.pricing', 'Subscription Plans')}
                            </Link>
                          </Button>
                        </div>

                        {/* Divider */}
                        <div className="my-3 h-px bg-border" />

                        {/* Language & Logout Section */}
                        <div className="space-y-2">
                          {/* Language Toggle */}
                          <div className="px-2 py-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">{t('common.language', 'Language')}</p>
                            <LanguageSwitcher />
                          </div>

                          {/* Sign Out */}
                          <SignOutButton
                            isMobile
                            onDone={() => setMobileMenuOpen(false)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Auth Nav */}
                        {authNavItems.map((item) => (
                          <Button
                            key={item.href}
                            variant="ghost"
                            asChild
                            className="justify-start text-base gap-2 h-11"
                          >
                            <Link
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon className="h-5 w-5" aria-hidden="true" />
                              {t(`header.${item.label}`, { defaultValue: item.label.charAt(0).toUpperCase() + item.label.slice(1) })}
                            </Link>
                          </Button>
                        ))}
                      </>
                    )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Bottom Row: Full-width Search Bar */}
            {!isSearchPage && !mobileMenuOpen && (
              <div className="border-t border-border/40 px-4 py-2">
                <GlobalSearchBar />
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
