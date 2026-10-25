'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@/components/ui/SectionHeader';

const illustrations = [
  '/ro/home/step-request-offer.webp',
  '/ro/home/step-find-match.webp',
  '/ro/home/step-connect-exchange.webp',
];

export function HowItWorksScroll() {
  const { t, i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');
  const steps = [
    {
      title: arabic ? 'اطلب وقدّم' : 'Request & Offer',
      body: t('home.howItWorksV2.step1.body'),
    },
    {
      title: arabic ? 'اعثر على تطابق' : 'Find a Match',
      body: t('home.howItWorksV2.step2.body'),
    },
    {
      title: arabic ? 'تواصل وتبادل' : 'Connect & Swap',
      body: t('home.howItWorksV2.step3.body'),
    },
  ];

  return (
    <section aria-labelledby="how-it-works-title" className="scroll-mt-24">
      <SectionHeader
        id="how-it-works-title"
        title={arabic ? 'كيف يعمل R&O' : 'How R&O Works'}
        centered
      />

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <motion.article
            key={step.title}
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.4, delay: index * 0.07 }}
            className="flex min-h-[320px] flex-col items-center rounded-2xl border border-[var(--ro-mint)] bg-[linear-gradient(155deg,#fff_0%,#f3f9f6_72%,#f7fce9_100%)] px-6 py-6 text-center shadow-[0_12px_28px_rgb(14_43_40/0.08)]"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[var(--ro-lime-gradient)] text-base font-black text-[var(--ro-deep-teal)] shadow-[0_7px_15px_rgb(14_43_40/0.12)]">
              {index + 1}
            </span>
            <Image
              src={illustrations[index]}
              alt=""
              width={180}
              height={180}
              className="my-3 h-[150px] w-[150px] object-contain"
            />
            <h3 className="text-lg font-black text-[var(--ro-deep-teal)]">{step.title}</h3>
            <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
