'use client';

import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { FilePlus, Search, Users } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HorizontalSnapCarousel, CarouselSlide } from '@/components/ui/HorizontalSnapCarousel';
import { cn } from '@/lib/utils';

const STEP_ICONS = [FilePlus, Search, Users];

export function HowItWorksScroll() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const steps = [
    { title: t('home.howItWorksV2.step1.title'), body: t('home.howItWorksV2.step1.body') },
    { title: t('home.howItWorksV2.step2.title'), body: t('home.howItWorksV2.step2.body') },
    { title: t('home.howItWorksV2.step3.title'), body: t('home.howItWorksV2.step3.body') },
  ];

  const StepCard = ({ index, className }: { index: number; className?: string }) => {
    const Icon = STEP_ICONS[index];
    const step = steps[index];
    return (
      <motion.article
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className={cn(
          'flex h-full flex-col rounded-2xl border border-[#c8d5b9] bg-white p-4 shadow-sm',
          className
        )}
      >
        <span className="text-xs font-bold text-[#d4642f]">0{index + 1}</span>
        <span className="mt-2 inline-flex size-11 items-center justify-center rounded-xl bg-[#3f7752]/10 text-[#3f7752]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-base font-semibold text-[#2d4a38]">{step.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </motion.article>
    );
  };

  return (
    <Reveal>
      <section aria-labelledby="how-it-works-title" className="space-y-4">
        <SectionHeader id="how-it-works-title" title={t('home.howItWorks.title')} centered />

        <div className="md:hidden">
          <HorizontalSnapCarousel
            ariaLabel={t('home.howItWorks.title')}
            showHint
            hintLabel={t('home.carousel.swipeHint', 'Swipe to explore')}
          >
            {steps.map((_, index) => (
              <CarouselSlide key={index} index={index} slideClassName="w-[88%]">
                <StepCard index={index} />
              </CarouselSlide>
            ))}
          </HorizontalSnapCarousel>
        </div>

        <div className="hidden gap-4 md:grid md:grid-cols-3">
          {steps.map((_, index) => (
            <StepCard key={index} index={index} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}
