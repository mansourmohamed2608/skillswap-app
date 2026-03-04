'use client';

import { MatchmakingForm } from '@/features/matchmaking/components/MatchmakingForm';
import { MatchesPanel } from '@/features/matchmaking/components/MatchesPanel';
import { SparklesIcon, UsersIcon } from 'lucide-react';
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

      {/* ── Step 1: AI suggestion form ── */}
      <MatchmakingForm />

      {/* ── Step 2: Live backend-computed exchange matches ── */}
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-4">
          <UsersIcon className="h-5 w-5 text-accent shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-primary leading-tight">Live Exchange Matches</h2>
            <p className="text-xs text-muted-foreground">
              Automatic matches based on pending requests you and other users have already created.
            </p>
          </div>
        </div>
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
