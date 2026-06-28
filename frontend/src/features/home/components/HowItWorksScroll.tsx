'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchIcon, SparklesIcon, UsersIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/lib/utils';

export function HowItWorksScroll() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { icon: SearchIcon, title: t('home.howItWorks.step1.title'), body: t('home.howItWorks.step1.body') },
    { icon: SparklesIcon, title: t('home.howItWorks.step2.title'), body: t('home.howItWorks.step2.body') },
    { icon: UsersIcon, title: t('home.howItWorks.step3.title'), body: t('home.howItWorks.step3.body') },
  ];

  return (
    <Reveal>
      <section aria-labelledby="how-it-works-title" className="space-y-5">
        <div className="text-center">
          <h2 id="how-it-works-title" className="text-2xl font-bold text-[#3f7752] sm:text-3xl">
            {t('home.howItWorks.title')}
          </h2>
        </div>

        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:snap-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / (el.clientWidth * 0.78));
            setActiveStep(Math.min(Math.max(idx, 0), steps.length - 1));
          }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={reduced ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="min-w-[78%] shrink-0 snap-center md:min-w-0"
              >
                <Card className="h-full border-[#c8d5b9] bg-white/90 shadow-md backdrop-blur-sm">
                  <CardContent className="p-5">
                    <span className="text-sm font-bold text-[#d4642f]">0{index + 1}</span>
                    <div className="my-3 inline-flex rounded-2xl bg-[#3f7752]/10 p-3">
                      <Icon className="h-6 w-6 text-[#3f7752]" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-[#3f7752]">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center gap-2 md:hidden">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn('h-2 rounded-full transition-all', i === activeStep ? 'w-6 bg-[#3f7752]' : 'w-2 bg-[#c8d5b9]')}
              aria-hidden="true"
            />
          ))}
        </div>

        {!user ? (
          <div className="rounded-3xl border border-[#c8d5b9] bg-[#3f7752]/5 px-5 py-8 text-center">
            <h3 className="text-xl font-bold text-[#3f7752]">{t('home.joinCta.title', 'Ready to start exchanging skills?')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('home.joinCta.body')}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="h-12 rounded-2xl bg-[#d4642f] hover:bg-[#d4642f]/90">
                <Link href="/auth/signup">{t('home.joinCta.primary', 'Join Now')}</Link>
              </Button>
              <Button variant="outline" asChild className="h-12 rounded-2xl border-[#3f7752] text-[#3f7752]">
                <Link href="/listings">{t('home.joinCta.explore', 'Explore Listings')}</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </Reveal>
  );
}
