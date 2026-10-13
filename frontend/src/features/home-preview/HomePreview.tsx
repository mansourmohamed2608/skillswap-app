'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, MessageCircle, Search } from 'lucide-react';
import { categories, copy, getCategoryFallback, getSearchSuggestions, listings, previewHighlights, type Locale } from './preview-content';
import styles from './home-preview.module.css';

type PreviewMode = 'guest' | 'member';

function PreviewIntroLogo() {
  return <span className={styles.introLogo} data-preview-logo-intro><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" /><path d="m18 22 4-4-4-4" /></svg><b>R<span className={styles.brandAmp}>&amp;</span>O</b></span>;
}

function PreviewImage({ src, categoryId, alt, sizes }: { src?: string; categoryId: string; alt: string; sizes: string }) {
  const fallback = getCategoryFallback(categoryId);
  const [currentSrc, setCurrentSrc] = useState(src || fallback);
  return <Image src={currentSrc} alt={alt} fill sizes={sizes} className={styles.photoImage} onError={() => setCurrentSrc(fallback)} />;
}

export function PreviewSearchBox({ locale, header = false, onClose }: { locale: Locale; header?: boolean; onClose?: () => void }) {
  const text = copy[locale];
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialQuery = typeof window === 'undefined' ? '' : (window as Window & { __homePreviewSearchQuery?: string }).__homePreviewSearchQuery || '';
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(header && !!initialQuery);
  const results = useMemo(() => getSearchSuggestions(query, locale), [locale, query]);
  useEffect(() => {
    const sync = (event: Event) => setQuery((event as CustomEvent<string>).detail || '');
    window.addEventListener('home-preview-search-query', sync);
    return () => window.removeEventListener('home-preview-search-query', sync);
  }, []);
  useEffect(() => {
    if (!header) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [header]);
  const update = (value: string) => {
    setQuery(value); setOpen(true); (window as Window & { __homePreviewSearchQuery?: string }).__homePreviewSearchQuery = value;
    window.dispatchEvent(new CustomEvent('home-preview-search-query', { detail: value }));
  };
  const dismiss = () => { setOpen(false); onClose?.(); };
  return <div className={`${styles.searchWrap}${header ? ` ${styles.headerSearchWrap}` : ''}`} data-preview-search={header ? undefined : 'true'} data-preview-header-search={header ? 'true' : undefined} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismiss(); }}>
    <form className={styles.searchForm} role="search" onSubmit={(event) => { event.preventDefault(); dismiss(); }}>
      <Search aria-hidden="true" size={20} />
      <label className="sr-only" htmlFor={id}>{text.searchLabel}</label>
      <input ref={inputRef} id={id} type="search" name="home-preview-search" value={query} onChange={(event) => update(event.target.value)} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } if (event.key === 'ArrowDown' && query.trim()) { event.preventDefault(); document.getElementById(`${id}-results`)?.querySelector<HTMLElement>('a')?.focus(); } }} placeholder={text.searchPlaceholder} autoComplete="off" role="combobox" aria-expanded={open && !!query.trim()} aria-controls={`${id}-results`} />
      <button type="submit" aria-label={text.searchLabel}>{locale === 'ar' ? <ArrowLeft aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</button>
    </form>
    {open && query.trim() ? <div className={styles.searchResults} id={`${id}-results`} role="listbox" aria-label={text.searchLabel}>
      {results.length ? results.map((item) => <Link href={item.href} key={item.id} role="option" onClick={dismiss}><span>{item.label}</span><small>{item.meta}</small></Link>) : <p>{text.searchEmpty}</p>}
      <Link href={`/listings?q=${encodeURIComponent(query)}`} className={styles.allResults} onClick={dismiss}>{text.viewAllFor} “{query}”</Link>
    </div> : null}
  </div>;
}

function ActionRow({ locale, className }: { locale: Locale; className?: string }) {
  const text = copy[locale];
  return <div className={`${styles.actionRow}${className ? ` ${className}` : ''}`}>
    <Link href="/listings/new" className={styles.primaryButton}>{text.post}</Link>
    <Link className={styles.secondaryButton} href="/listings">{text.browse}</Link>
  </div>;
}

function HowItWorks({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const illustrations = ['/design-preview/home/v5/step-request-offer.webp', '/design-preview/home/v5/step-find-match.webp', '/design-preview/home/v5/step-connect-exchange.webp'];
  return <section className={styles.section} aria-labelledby="preview-how-title" data-preview-section="how-it-works">
    <div className={`${styles.sectionHeading} ${styles.howHeading}`}><h2 id="preview-how-title">{text.howTitle}</h2></div>
    <div className={styles.stepsGrid}>{text.steps.map((step, index) => <article className={styles.stepCard} key={step.title}><span className={styles.stepNumber}>{index + 1}</span><Image src={illustrations[index]} alt="" width={180} height={180} className={styles.stepIllustration} /><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
  </section>;
}

function FeaturedListings({ locale }: { locale: Locale }) {
  const text = copy[locale]; const railRef = useRef<HTMLDivElement>(null); const [active, setActive] = useState(0); const reduced = useReducedMotion();
  const moveTo = (index: number) => { const next = Math.max(0, Math.min(listings.length - 1, index)); const card = railRef.current?.children[next] as HTMLElement | undefined; card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }); setActive(next); };
  const slideFeedback = text.slideFeedback.replace('{current}', String(active + 1)).replace('{total}', String(listings.length));
  return <section className={styles.section} aria-labelledby="preview-featured-title" data-preview-section="featured-listings">
    <div className={styles.sectionHeading}><h2 id="preview-featured-title">{text.featuredTitle}</h2><p>{text.featuredBody}</p></div>
    <div className={styles.listingRail} ref={railRef} tabIndex={0} data-listing-rail onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const forward = locale === 'ar' ? event.key === 'ArrowLeft' : event.key === 'ArrowRight'; moveTo(active + (forward ? 1 : -1)); } }} onScroll={(event) => { const rail = event.currentTarget; const center = rail.getBoundingClientRect().left + rail.clientWidth / 2; const distances = Array.from(rail.children).map((child) => Math.abs((child as HTMLElement).getBoundingClientRect().left + (child as HTMLElement).clientWidth / 2 - center)); setActive(distances.indexOf(Math.min(...distances))); }}>
      {listings.map((listing, index) => <article className={styles.listingCard} key={listing.id} data-active-listing={index === active ? 'true' : undefined}><div className={styles.listingMedia} data-listing-media><PreviewImage src={listing.image} categoryId={listing.categoryId} alt={listing.title[locale]} sizes="(max-width: 767px) 82vw, (max-width: 1180px) 47vw, 24vw" /></div><div className={styles.listingContent} data-listing-body><span className={styles.categoryName}>{listing.category[locale]}</span><h3>{listing.title[locale]}</h3><p className={styles.listingDescription}>{listing.description[locale]}</p><dl className={styles.exchangeGrid}><div><dt>{text.request}</dt><dd>{listing.lookingFor[locale]}</dd></div><div><dt>{text.offer}</dt><dd>{listing.offer[locale]}</dd></div></dl><p className={styles.ownerLine}><b>{listing.owner[locale].slice(0, 1)}</b><span>{listing.owner[locale]}<small>{listing.location[locale]}</small></span></p><div className={styles.cardActions} data-listing-actions><button type="button"><MessageCircle size={14} aria-hidden="true" />{text.message}</button><button type="button">{text.details}</button></div></div></article>)}
    </div>
    <div className={styles.listingSlideFeedback} aria-live="polite" data-listing-slide-feedback>{slideFeedback}</div>
    <div className={styles.listingDots} aria-label={text.featuredTitle}>{listings.map((listing, index) => <button type="button" key={listing.id} className={index === active ? styles.activeDot : undefined} aria-label={`${index + 1}: ${listing.title[locale]}`} aria-current={index === active ? 'true' : undefined} onClick={() => moveTo(index)} />)}</div>
    <Link className={styles.viewMore} href="/listings">{text.viewAll} {locale === 'ar' ? <ArrowLeft aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</Link>
  </section>;
}

export function HomePreview() {
  const { i18n } = useTranslation(); const [language, setLanguage] = useState(i18n.language); const locale: Locale = language?.startsWith('ar') ? 'ar' : 'en'; const text = copy[locale]; const reduced = useReducedMotion();
  const [mode, setMode] = useState<PreviewMode>('guest'); const [expanded, setExpanded] = useState(false); const [intro, setIntro] = useState(false); const heroWidth = useSyncExternalStore(() => () => undefined, () => new URLSearchParams(window.location.search).get('hero') === 'full' ? 'full' : 'contained', () => 'contained'); const moreButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { const listener = (next: string) => setLanguage(next); const previewListener = (event: Event) => setLanguage((event as CustomEvent<string>).detail); const timer = window.setTimeout(() => { const currentLocale = (window as Window & { __homePreviewLocale?: string }).__homePreviewLocale; if (currentLocale) setLanguage(currentLocale); }, 0); i18n.on('languageChanged', listener); window.addEventListener('home-preview-locale', previewListener); return () => { window.clearTimeout(timer); i18n.off('languageChanged', listener); window.removeEventListener('home-preview-locale', previewListener); }; }, [i18n]);
  useEffect(() => { if (reduced || sessionStorage.getItem('home-preview-intro-seen')) return; const start = window.setTimeout(() => setIntro(true), 0); return () => window.clearTimeout(start); }, [reduced]);
  useEffect(() => { if (!intro) return; const timer = window.setTimeout(() => { setIntro(false); sessionStorage.setItem('home-preview-intro-seen', 'true'); }, 1100); return () => window.clearTimeout(timer); }, [intro]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('home-preview-mode', { detail: mode })); }, [mode]);
  useEffect(() => { const listener = (event: Event) => setMode((event as CustomEvent<PreviewMode>).detail || 'guest'); window.addEventListener('home-preview-mode', listener); return () => window.removeEventListener('home-preview-mode', listener); }, []);
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const saved = new Map(['max-width', 'width', 'margin', 'padding', 'background-color'].map((property) => [property, main.style.getPropertyValue(property)]));
    main.style.setProperty('max-width', 'none'); main.style.setProperty('width', '100%'); main.style.setProperty('margin', '0'); main.style.setProperty('padding', '0'); main.style.setProperty('background-color', '#fff');
    return () => saved.forEach((value, property) => main.style.setProperty(property, value));
  }, []);
  return <><style>{'#main-content:has([data-home-preview-canvas]){max-width:none!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important;}'}</style><div className={`${styles.preview} ${styles.previewTheme}`} data-home-preview-canvas="true" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    {intro ? <div className={styles.intro} aria-live="polite"><PreviewIntroLogo /><button type="button" onClick={() => { setIntro(false); sessionStorage.setItem('home-preview-intro-seen', 'true'); }}>Skip</button></div> : null}
    <div className={styles.previewNotice} role="note"><span>{text.previewLabel}</span><button type="button" onClick={() => setMode(mode === 'guest' ? 'member' : 'guest')}>{mode === 'guest' ? text.guest : text.member}</button></div>
    <section className={`${styles.heroSurface}${heroWidth === 'full' ? ` ${styles.heroFullBleed}` : ''}`} aria-labelledby="preview-hero-title" data-preview-section="hero" data-hero-width={heroWidth}><div className={styles.hero}><div className={styles.heroCopy}><h1 id="preview-hero-title">R<span className={styles.brandAmp}>&amp;</span>O</h1><p className={styles.slogan}>{text.heroLine1}</p><p className={styles.heroSupporting}>{text.heroLine2}</p><p className={styles.heroSupporting}>{text.heroLine3}</p><PreviewSearchBox locale={locale} /><ActionRow locale={locale} /></div><div className={styles.heroMedia}><Image src="/design-preview/home/v3-service-objects-hero.png" alt={locale === 'ar' ? 'تكوين علوي يضم غيتارًا ودفترًا وكاميرا وأدوات على مكتب' : 'Flat-lay composition of a guitar, notebook, camera, and tools on a desk'} fill preload sizes="(max-width: 767px) calc(100vw - 2rem), 52vw" /></div></div></section>
    <HowItWorks locale={locale} />
    <section className={styles.section} aria-labelledby="preview-categories-title" data-preview-section="categories"><div className={styles.sectionHeading}><h2 id="preview-categories-title">{text.categoriesTitle}</h2><p>{text.categoriesBody}</p></div><div className={styles.categoryAction}><Link href="/pricing" className={styles.subscribeButton}>{text.subscribeNow}</Link></div><div className={styles.categoryGrid} data-expanded={expanded ? 'true' : 'false'}>{categories.map((category) => <Link href={`/listings?category=${encodeURIComponent(category.listingCategory)}`} key={category.id} className={styles.categoryTile} data-category={category.id}><span className={styles.categoryVisual}><PreviewImage src={`/design-preview/home/v5/category-${category.id}.webp`} categoryId={category.id} alt="" sizes="(max-width: 767px) 29vw, (max-width: 900px) 22vw, 140px" /></span><strong>{category.label[locale]}</strong></Link>)}</div><button ref={moreButton} type="button" className={styles.expandButton} aria-expanded={expanded} onClick={() => { setExpanded(!expanded); if (expanded) moreButton.current?.focus(); }}>{expanded ? text.viewLess : text.viewMore}</button></section>
    <FeaturedListings locale={locale} />
    <section className={`${styles.section} ${styles.highlights}`} aria-labelledby="preview-highlights-title" data-preview-section="community-highlights"><div className={styles.sectionHeading}><h2 id="preview-highlights-title">{text.highlightsTitle}</h2><p className={styles.previewExamples}>{text.previewExamples}</p></div><div className={styles.highlightGrid}>{previewHighlights.map((item, index) => <article key={item.name.en} className={styles.highlightCard}><div className={styles.initials} aria-hidden="true">{item.name[locale].slice(0, 1)}</div><div className={styles.highlightCopy}><span>{index === 0 ? text.previewMemberExample : text.previewSwapStory}</span><h3>{item.name[locale]}</h3><p>{item.skill[locale]}</p><blockquote>{item.story[locale]}</blockquote></div><Image className={styles.highlightIllustration} src={index === 0 ? '/design-preview/home/v5/step-find-match.webp' : '/design-preview/home/v5/step-connect-exchange.webp'} alt="" width={88} height={88} /></article>)}</div></section>
    <section className={styles.appSection} aria-labelledby="preview-app-title" data-preview-section="get-app"><div><h2 id="preview-app-title">{text.appTitle}</h2><p>{text.appBody}</p></div><ActionRow locale={locale} /></section>
  </div></>;
}
