
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  MenuIcon,
  HomeIcon,
  ListIcon,
  UserIcon,
  SparklesIcon,
  MessageCircle,
  CalendarDays,
  LogInIcon,
  UserPlusIcon,
  LogOutIcon,
  Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { GlobalSearchBar } from '@/features/home/components/GlobalSearchBar';
import { MoreDropdown } from '@/components/layout/MoreDropdown';
import { ExpandedSearchBar } from '@/components/layout/ExpandedSearchBar';

// Primary nav items (visible on desktop)
const primaryNavItems = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/listings', label: 'Listings', icon: ListIcon },
  { href: '/matchmaking', label: 'AI Matchmaking', icon: SparklesIcon },
];

// Authenticated user items
const privateNavItems = [
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

// Unauthenticated user items
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
      className={isMobile ? 'justify-start text-base py-3 w-full gap-2' : ''}
      aria-label={t('header.signOut')}
    >
      <LogOutIcon className={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
      {isMobile && <span>{t('header.signOut')}</span>}
    </Button>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isAuthenticated = !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
          {/* Desktop Header Layout */}
          <div className="hidden md:flex h-16 items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 text-primary hover:text-primary/80 transition-colors">
              <AppLogo />
              <span className="font-bold text-lg hidden lg:inline">{t('common.appName')}</span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="flex-1 max-w-md">
              <GlobalSearchBar />
            </div>

            {/* Primary Navigation */}
            <nav className="flex items-center gap-1">
              {primaryNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-sm"
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{t(`header.${item.label.toLowerCase().replace(' ', '')}`)}</span>
                  </Link>
                </Button>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated ? (
                <>
                  {/* Bookings (primary) */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.bookings')}>
                    <Link href="/bookings">
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Chat */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.chat')}>
                    <Link href="/chat">
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Profile */}
                  <Button variant="ghost" size="icon" asChild aria-label={t('header.profile')}>
                    <Link href="/profile">
                      <UserIcon className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* More Dropdown */}
                  <MoreDropdown />
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/signin" className="flex items-center gap-2">
                      <LogInIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('header.signIn')}</span>
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="bg-primary hover:bg-primary/90">
                    <Link href="/auth/signup" className="flex items-center gap-2">
                      <UserPlusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('header.signUp')}</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Header Layout */}
          <div className="md:hidden flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
              <AppLogo />
              <span className="font-bold text-sm">{t('common.appName')}</span>
            </Link>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1">
              {/* Search Icon */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(true)}
                aria-label={t('home.search.label', 'Search')}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Hamburger Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.menu', 'Menu')}
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                {/* Mobile Menu Content */}
                <SheetContent
                  side={i18n.dir() === 'rtl' ? 'left' : 'right'}
                  className="w-[280px]"
                >
                  <div className="mt-8 flex flex-col gap-2">
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
                          <item.icon className="h-5 w-5" />
                          {t(`header.${item.label.toLowerCase().replace(' ', '')}`)}
                        </Link>
                      </Button>
                    ))}

                    {/* Divider */}
                    <div className="my-2 h-px bg-border" />

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
                              <item.icon className="h-5 w-5" />
                              {t(`header.${item.label.toLowerCase().replace(' ', '')}`)}
                            </Link>
                          </Button>
                        ))}

                        {/* Divider */}
                        <div className="my-2 h-px bg-border" />

                        {/* Secondary Items */}
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
                            {t('header.pricing')}
                          </Link>
                        </Button>

                        {/* Divider */}
                        <div className="my-2 h-px bg-border" />

                        {/* Sign Out */}
                        <SignOutButton
                          isMobile
                          onDone={() => setMobileMenuOpen(false)}
                        />
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
                              <item.icon className="h-5 w-5" />
                              {t(`header.${item.label.toLowerCase().replace(/\s/g, '')}`)}
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
        </div>
      </header>

      {/* Mobile Expanded Search Bar */}
      {mobileSearchOpen && <ExpandedSearchBar onClose={() => setMobileSearchOpen(false)} />}
    </>
  );
}
