'use client';

import { useState } from 'react';
import { MessageCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { cn } from '@/lib/utils';
import { getListingMessageDecision, getListingMessagePath } from './message-listing';

export { getListingMessageDecision, getListingMessagePath } from './message-listing';

type Props = {
  listingId: string;
  ownerId: string;
  ownerName?: string | null;
  compact?: boolean;
  className?: string;
};

/**
 * Opens an existing or empty composer for the listing owner. Merely opening the
 * composer never creates a conversation or sends a message; the backend does
 * that only after the member explicitly submits text.
 */
export function MessageListingButton({ listingId, ownerId, ownerName, compact = false, className }: Props) {
  const { user } = useAuth();
  const { active, canSendMessage, loading, error } = useMembership();
  const { t } = useTranslation();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const destination = getListingMessagePath(listingId, ownerId, ownerName);
  const decision = getListingMessageDecision({
    userId: user?.uid,
    ownerId,
    destination,
    membershipLoading: loading || Boolean(error),
    membershipActive: active,
    canSendMessage,
    navigating,
  });

  if (decision.kind === 'hidden') return null;

  function openComposer() {
    if (decision.kind !== 'navigate' || !decision.href) return;
    setNavigating(true);
    router.push(decision.href);
  }

  return (
    <Button
      type="button"
      size={compact ? 'sm' : 'lg'}
      variant="secondary"
      className={cn(compact ? 'h-10 rounded-xl text-xs' : 'h-12 rounded-lg sm:flex-1', 'w-full', className)}
      onClick={openComposer}
      disabled={decision.kind === 'disabled'}
      aria-label={t('listings.actions.message', { defaultValue: 'Message' })}
    >
      <MessageCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate font-semibold leading-none">
        {t('listings.actions.message', { defaultValue: 'Message' })}
      </span>
    </Button>
  );
}
