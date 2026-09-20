'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coins, GemIcon, Heart, LogOut, MenuIcon, SettingsIcon } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/services/firebase';

export function MoreDropdown() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    if (auth) await signOut(auth);
    setOpen(false);
    router.push('/');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('header.burger', 'Menu')}>
          <MenuIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="justify-start gap-2" asChild>
            <Link href="/pricing" onClick={() => setOpen(false)}>
              <GemIcon className="h-4 w-4" />
              {t('header.pricing', 'Subscription Plans')}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2" asChild>
            <Link href="/wishes" onClick={() => setOpen(false)}><Heart className="h-4 w-4" />{t('header.wishes', 'Wishes')}</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" className="justify-start gap-2" asChild>
                <Link href="/wallet" onClick={() => setOpen(false)}><Coins className="h-4 w-4" />{t('wallet.title', 'Wallet')}</Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start gap-2" asChild>
                <Link href="/settings" onClick={() => setOpen(false)}>
                  <SettingsIcon className="h-4 w-4" />
                  {t('nav.mobile.settings', 'Settings')}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                {t('header.logout', 'Logout')}
              </Button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
