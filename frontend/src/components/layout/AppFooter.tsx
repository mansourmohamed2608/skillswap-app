
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon, HomeIcon, ListIcon, UserIcon, SparklesIcon, MessageCircle, CalendarDays, LogInIcon, UserPlusIcon, LogOutIcon, GemIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

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

function SignOutButton({ isMobile = false, onDone }: { isMobile?: boolean; onDone?: () => void }) {
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
      onClick={handleSignOut}
      className={isMobile ? "justify-start text-lg py-3 w-full" : "w-auto"}
    >
      <LogOutIcon className={isMobile ? "h-5 w-5 mr-3" : "h-4 w-4"} />
      {t('header.signOut')}
    </Button>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isAuthenticated = !!user;
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <AppLogo />
          <span className="font-bold text-xl">{t('common.appName')}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 items-center">
          {publicNavItems.map((item) => (
            <Button key={item.label} variant="ghost" asChild>
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {labelFor(item.href, item.label)}
              </Link>
            </Button>
          ))}
          {isAuthenticated ? (
            <>
              {privateNavItems.map((item) => (
                <Button key={item.label} variant="ghost" asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {labelFor(item.href, item.label)}
                  </Link>
                </Button>
              ))}
              <SignOutButton />
            </>
          ) : (
            authNavItems.map((item) => (
              <Button key={item.label} variant="ghost" asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {labelFor(item.href, item.label)}
                </Link>
              </Button>
            ))
          )}
          <LanguageSwitcher compact />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher compact />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
              <div className="mt-8 flex flex-col gap-1">
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
                    {privateNavItems.map((item) => (
                      <Button key={`mobile-${item.href}`} variant="ghost" asChild className="justify-start text-base">
                        <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {labelFor(item.href, item.label)}
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
