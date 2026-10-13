'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown, LogIn, LogOut, Menu, MessageCircle, Search, UserPlus, UserRound, X } from 'lucide-react';
import { categories, copy, type Locale } from './preview-content';
import { PreviewSearchBox } from './HomePreview';
import styles from './home-preview.module.css';

function PreviewLogo() {
  return <Link href="/design-preview/home" className="flex shrink-0 items-center gap-1.5 text-[var(--ss-deep-teal)]" aria-label="R&O home" data-preview-logo>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" />
      <path d="m18 22 4-4-4-4" />
    </svg>
    <span className={styles.previewWordmark}><b>R<span className={styles.brandAmp}>&amp;</span>O</b><small>Request &amp; Offer</small></span>
  </Link>;
}

export function PreviewHeader() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);
  const locale: Locale = language?.startsWith('ar') ? 'ar' : 'en';
  const text = copy[locale];
  const [mode, setMode] = useState<'guest' | 'member'>('guest');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [appBannerVisible, setAppBannerVisible] = useState(true);

  useEffect(() => {
    const listener = (event: Event) => setMode((event as CustomEvent<'guest' | 'member'>).detail || 'guest');
    window.addEventListener('home-preview-mode', listener);
    return () => window.removeEventListener('home-preview-mode', listener);
  }, []);
  useEffect(() => {
    const listener = (next: string) => setLanguage(next);
    i18n.on('languageChanged', listener);
    return () => i18n.off('languageChanged', listener);
  }, [i18n]);
  useEffect(() => { const listener = (event: Event) => setLanguage((event as CustomEvent<string>).detail); window.addEventListener('home-preview-locale', listener); return () => window.removeEventListener('home-preview-locale', listener); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nav = navigator as Navigator & { standalone?: boolean };
      const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
      setAppBannerVisible(!standalone && sessionStorage.getItem('home-preview-app-banner-dismissed') !== 'true');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const languageButton = <button type="button" className="rounded-xl border border-[color:var(--ss-mint)] px-2 py-2 text-xs font-bold text-[var(--ss-deep-teal)] sm:px-3" onClick={() => { const next = locale === 'ar' ? 'en' : 'ar'; (window as Window & { __homePreviewLocale?: string }).__homePreviewLocale = next; setLanguage(next); window.dispatchEvent(new CustomEvent('home-preview-locale', { detail: next })); }}>{locale === 'ar' ? 'EN' : 'AR'}</button>;
  const categoryMenu = <div className="relative">
    <button type="button" className="flex items-center gap-1" onClick={() => setCategoriesOpen(!categoriesOpen)} aria-expanded={categoriesOpen}>Categories <ChevronDown size={14} /></button>
    {categoriesOpen ? <div className="absolute top-full z-50 mt-2 grid w-64 grid-cols-2 gap-1 rounded-xl border border-[#d8e7da] bg-white p-2 shadow-xl">{categories.map((category) => <Link key={category.id} href={`/listings?category=${encodeURIComponent(category.listingCategory)}`} className="rounded-lg px-2 py-2 text-xs hover:bg-[#f2faf3]">{category.label[locale]}</Link>)}</div> : null}
  </div>;
  const navigation = <><Link href="/design-preview/home">Home</Link>{categoryMenu}<Link href="/listings">Listings</Link><Link href="/matchmaking">AI Matching</Link><Link href="/pricing">Subscriptions</Link><a href="#preview-app-title">Get the App</a></>;

  const dismissAppBanner = () => { sessionStorage.setItem('home-preview-app-banner-dismissed', 'true'); setAppBannerVisible(false); };
  const setPreviewMode = (next: 'guest' | 'member') => { setMode(next); window.dispatchEvent(new CustomEvent('home-preview-mode', { detail: next })); };
  const mobileDrawerActions = mode === 'guest'
    ? <div className="mt-6 border-t border-[color:var(--ss-light-surface)] pt-5" data-preview-mobile-drawer-state="guest"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#567064]">{text.guestPreview}</p><div className="grid grid-cols-2 gap-2"><Link href="/auth/signin" prefetch={false} className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--ss-mint)] px-3 py-2.5 text-sm font-bold text-[var(--ss-deep-teal)]"><LogIn size={16} aria-hidden="true" />{text.signIn}</Link><Link href="/auth/signup" prefetch={false} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--ss-primary-background)] px-3 py-2.5 text-sm font-bold text-[var(--ss-primary-text)]"><UserPlus size={16} aria-hidden="true" />{text.join}</Link></div></div>
    : <div className="mt-6 border-t border-[color:var(--ss-light-surface)] pt-5" data-preview-mobile-drawer-state="member"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#567064]">{text.memberPreview}</p><div className="grid gap-2"><Link href="/profile" className="flex items-center gap-2 rounded-xl border border-[color:var(--ss-mint)] px-3 py-2.5 text-sm font-bold text-[var(--ss-deep-teal)]"><UserRound size={16} aria-hidden="true" />{text.account}</Link><Link href="/chat" className="flex items-center gap-2 rounded-xl border border-[color:var(--ss-mint)] px-3 py-2.5 text-sm font-bold text-[var(--ss-deep-teal)]"><MessageCircle size={16} aria-hidden="true" />{text.messages}</Link><button type="button" onClick={() => { setPreviewMode('guest'); setMenuOpen(false); }} className="flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,#0e2b28,#278a78)] px-3 py-2.5 text-sm font-bold text-white"><LogOut size={16} aria-hidden="true" />{text.signOut}</button></div></div>;

  return <>
    <div className={`fixed inset-x-0 top-0 z-[70] bg-white text-[#17382c] ${styles.previewTheme}`} data-preview-header-chrome>
      {appBannerVisible ? <div className="flex h-10 items-center gap-2 border-b border-[color:var(--ss-mint)] bg-[var(--ss-light-surface)] px-3 text-xs text-[var(--ss-deep-teal)] md:hidden" data-preview-app-banner>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--ss-mint)] text-[var(--ss-deep-teal)]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" /><path d="m18 22 4-4-4-4" /></svg></span>
        <p className="min-w-0 flex-1 truncate font-semibold">R&amp;O in your pocket</p>
        <a href="#preview-app-title" className="rounded-lg bg-[var(--ss-primary-background)] px-2.5 py-1.5 font-bold text-[var(--ss-primary-text)]">Get App</a>
        <button type="button" onClick={dismissAppBanner} className="rounded-lg px-1.5 py-1 font-semibold text-[#4f665d] underline underline-offset-2" aria-label="Close app banner">Close</button>
      </div> : null}
      <header className="border-b border-[color:var(--ss-mint)] bg-white/95 text-[var(--ss-deep-teal)] backdrop-blur" data-home-preview-shell="true">
    <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6" data-home-preview-header-row>
      <PreviewLogo />
      <nav className="hidden items-center gap-4 text-sm font-semibold lg:flex">{navigation}</nav>
      <div className="ms-auto flex items-center gap-2">
        <div className="relative">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--ss-mint)] text-[var(--ss-deep-teal)]" onClick={() => setSearchOpen(!searchOpen)} aria-label={text.searchButton} aria-expanded={searchOpen}><Search size={18} /></button>
          {searchOpen ? <div className={styles.headerSearchMenu}><PreviewSearchBox locale={locale} header onClose={() => setSearchOpen(false)} /></div> : null}
        </div>
        {languageButton}
        <Link href="/profile?tab=notifications" className="grid h-9 w-9 place-items-center rounded-xl text-[var(--ss-deep-teal)] transition-colors hover:bg-[var(--ss-light-surface)]" aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}><Bell size={18} aria-hidden="true" /></Link>
        <Link href="/chat" className="grid h-9 w-9 place-items-center rounded-xl text-[var(--ss-deep-teal)] transition-colors hover:bg-[var(--ss-light-surface)]" aria-label={text.messages}><MessageCircle size={18} aria-hidden="true" /></Link>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-[#d7e7d9]" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu size={20} /></button>
      </div>
    </div>
      </header>
    </div>
    <div aria-hidden="true" className={`h-16 bg-white ${appBannerVisible ? 'max-md:h-[104px]' : ''}`} />
    {menuOpen ? <div className="fixed inset-0 z-[90] bg-[#17382c]/25"><div className="ms-auto h-full w-[min(88vw,380px)] overflow-y-auto bg-white p-5 shadow-2xl"><div className="mb-6 flex items-center justify-between"><PreviewLogo /><button type="button" onClick={() => setMenuOpen(false)} aria-label={text.close}><X /></button></div><nav className="grid gap-4 text-base font-semibold" onClick={() => setMenuOpen(false)}>{navigation}</nav>{mobileDrawerActions}<div className="mt-6 border-t border-[#e0ece2] pt-5"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#567064]">{text.language}</span>{languageButton}</div></div></div> : null}
  </>;
}
