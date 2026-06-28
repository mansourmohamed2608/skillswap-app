'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/Reveal';

export function TahaduSection() {
  const { t } = useTranslation();

  const cards = [
    {
      icon: Gift,
      title: t('home.tahadu.giveTitle'),
      body: t('home.tahadu.giveBody'),
      href: '/wishes',
      cta: t('home.tahadu.giveCta'),
    },
    {
      icon: Sparkles,
      title: t('home.tahadu.shareTitle'),
      body: t('home.tahadu.shareBody'),
      href: '/wishes/request',
      cta: t('home.tahadu.shareCta'),
    },
  ];

  return (
    <Reveal>
      <section aria-labelledby="tahadu-title" className="space-y-4">
        <div className="text-center">
          <h2
            id="tahadu-title"
            className="text-xl font-bold text-[#3f7752] sm:text-2xl [font-family:var(--font-cairo),Cairo,sans-serif]"
            dir="rtl"
            lang="ar"
          >
            {t('home.tahadu.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('home.tahadu.subtitle')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col rounded-2xl border border-[#c8d5b9]/80 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#3f7752]/10 text-[#3f7752]">
                  <card.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#2d4a38]">{card.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-4 h-10 w-full rounded-xl border-[#3f7752] text-[#3f7752] sm:w-auto sm:self-start"
              >
                <Link href={card.href}>{card.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
