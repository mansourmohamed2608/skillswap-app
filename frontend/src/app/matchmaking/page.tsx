'use client';

import { MatchmakingForm } from '@/features/matchmaking/components/MatchmakingForm';
import { MatchesPanel } from '@/features/matchmaking/components/MatchesPanel';
import { SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MatchmakingPage() {
  const { t } = useTranslation();
  const noteLabel = t('matchmaking.page.noteLabel');
  const noteBody = t('matchmaking.page.noteBody');
  return (
    <div className="space-y-8">
      <header className="text-center">
        <SparklesIcon className="mx-auto h-12 w-12 text-accent mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">{t('matchmaking.page.title')}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('matchmaking.page.subtitle')}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          {t('matchmaking.page.noteBody')}
        </p>
      </header>
      
      <MatchmakingForm />

      <div className="mt-2">
        <MatchesPanel />
      </div>

      <div className="mt-12 p-6 bg-card rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-3 text-primary">{t('matchmaking.page.howTitle')}</h2>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
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
    </div>
  );
}
