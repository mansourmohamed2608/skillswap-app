
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HomeIcon,
  ListIcon,
  UserIcon,
  SparklesIcon,
  MessageCircle,
  CalendarDays,
  UserPlusIcon,
  GemIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from 'react-i18next';
import { serviceCategories } from '@/services/serviceCategories';

const publicNavItems = [
  { href: '/', key: 'home', icon: HomeIcon },
  { href: '/listings', key: 'listings', icon: ListIcon },
  { href: '/matchmaking', key: 'matchmaking', icon: SparklesIcon },
  { href: '/pricing', key: 'pricing', icon: GemIcon },
];

const privateNavItems = [
  { href: '/bookings', key: 'bookings', icon: CalendarDays },
  { href: '/chat', key: 'chat', icon: MessageCircle },
  { href: '/profile', key: 'profile', icon: UserIcon },
];

const AppLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-7 w-7 text-primary shrink-0"
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

function SignOutButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    router.push('/');
  };

  return (
    <Button variant="ghost" onClick={handleSignOut} className="h-11 rounded-xl">
      {t('header.signOut')}
    </Button>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const isAuthenticated = !!user;

  const labelFor = (key: string) => t(`header.${key}`);

  const handleSignOut = async () => {
    if (auth) await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#c8d5b9]/60 bg-[#f7f6df]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f7f6df]/80">
      <PageContainer className="flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-primary transition-colors hover:text-primary/80">
          <AppLogo />
          <span className="truncate text-lg font-bold sm:text-xl">{t('common.appName')}</span>
        </Link>

        {/* Desktop Navigation — lg and up */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {publicNavItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild className="h-11 rounded-xl px-3">
              <Link href={item.href} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {labelFor(item.key)}
              </Link>
            </Button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 gap-1 rounded-xl px-3">
                {t('header.categories')}
                <ChevronDownIcon className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuItem asChild>
                <Link href="/listings">{t('services.allCategories')}</Link>
              </DropdownMenuItem>
              {serviceCategories.map((category) => (
                <DropdownMenuItem key={category} asChild>
                  <Link href={`/listings?category=${encodeURIComponent(category)}`}>
                    {category}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <>
              {privateNavItems.map((item) => (
                <Button key={item.href} variant="ghost" asChild className="h-11 rounded-xl px-3">
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {labelFor(item.key)}
                  </Link>
                </Button>
              ))}
              <SignOutButton />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="h-11 rounded-xl">
                <Link href="/auth/signin">{t('header.signIn')}</Link>
              </Button>
            </>
          )}
          <LanguageSwitcher compact />
          {!isAuthenticated ? (
            <Button asChild variant="accent" className="ms-1 hidden xl:inline-flex">
              <Link href="/auth/signup">
                <UserPlusIcon className="me-1 h-4 w-4" />
                {t('header.signUp')}
              </Link>
            </Button>
          ) : null}
        </nav>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {!isAuthenticated ? (
            <Button asChild variant="accent" size="sm" className="h-10 px-3 text-xs sm:h-11 sm:px-4 sm:text-sm">
              <Link href="/auth/signup">{t('header.signUp')}</Link>
            </Button>
          ) : null}
          <MobileMenu isAuthenticated={isAuthenticated} onSignOut={handleSignOut} />
        </div>
      </PageContainer>
    </header>
  );
}
