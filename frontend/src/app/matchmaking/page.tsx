'use client';

import { MatchmakingForm } from '@/features/matchmaking/components/MatchmakingForm';
import { MatchesPanel } from '@/features/matchmaking/components/MatchesPanel';
import { SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';

export default function MatchmakingPage() {
  const { t } = useTranslation();
  const noteLabel = t('matchmaking.page.noteLabel');
  const noteBody = t('matchmaking.page.noteBody');

  return (
    <Section tight className="pt-6">
      <PageContainer className="space-y-6 sm:space-y-8">
        <header className="text-center">
          <SparklesIcon className="mx-auto mb-3 h-10 w-10 text-[#d4642f] sm:h-12 sm:w-12" />
          <h1 className="text-3xl font-bold tracking-tight text-[#3f7752] sm:text-4xl">
            {t('matchmaking.page.title')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            {t('matchmaking.page.subtitle')}
          </p>
        </header>

        <MatchmakingForm />
        <MatchesPanel />

        <div className="rounded-2xl border border-[#c8d5b9] bg-[#fffdf0] p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-xl font-semibold text-[#3f7752]">{t('matchmaking.page.howTitle')}</h2>
          <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground sm:text-base">
            <li>{t('matchmaking.page.steps.one')}</li>
            <li>{t('matchmaking.page.steps.two')}</li>
            <li>{t('matchmaking.page.steps.three')}</li>
            <li>{t('matchmaking.page.steps.four')}</li>
          </ol>
          {noteLabel && noteBody ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>{noteLabel}</strong> {noteBody}
            </p>
          ) : null}
        </div>
      </PageContainer>
    </Section>
  );
}
