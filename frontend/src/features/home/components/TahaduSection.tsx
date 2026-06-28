'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Heart, Star } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

export function TahaduSection() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  return (
    <Reveal>
      <section aria-labelledby="tahadu-title" className="rounded-3xl border border-[#c8d5b9] bg-gradient-to-br from-[#fffdf0] to-[#fbfaee] p-5 shadow-sm sm:p-6">
        <div className="mb-6 text-center">
          <h2 id="tahadu-title" className="text-3xl font-extrabold tracking-tight text-[#3f7752] sm:text-4xl" dir="rtl" lang="ar">
            تهادوا تحابوا
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('home.tahadu.subtitle')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: Heart,
              title: t('home.tahadu.supportTitle', "Support Someone's Goal"),
              body: t('home.tahadu.supportBody', 'Help a community member move closer to their dream.'),
              href: '/wishes',
              cta: t('home.tahadu.supportCta', 'Support'),
              primary: true,
            },
            {
              icon: Star,
              title: t('home.tahadu.shareTitle', 'Share Your Goal'),
              body: t('home.tahadu.shareBody', "Tell the community what you're trying to achieve."),
              href: '/wishes/request',
              cta: t('home.tahadu.shareCta', 'Share Goal'),
              primary: false,
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full border-[#c8d5b9] bg-white/80 shadow-sm backdrop-blur-sm">
                <CardContent className="p-5 text-center">
                  <card.icon className="mx-auto mb-3 h-8 w-8 text-[#d4642f]" aria-hidden="true" />
                  <h3 className="font-semibold text-[#3f7752]">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
                </CardContent>
                <CardFooter className="justify-center pb-5 pt-0">
                  <Button
                    asChild
                    variant={card.primary ? 'default' : 'outline'}
                    className={cnBtn(card.primary)}
                  >
                    <Link href={card.href}>{card.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

function cnBtn(primary: boolean) {
  return primary
    ? 'h-11 w-full rounded-2xl bg-[#d4642f] hover:bg-[#d4642f]/90 sm:w-auto'
    : 'h-11 w-full rounded-2xl border-[#3f7752] text-[#3f7752] sm:w-auto';
}
