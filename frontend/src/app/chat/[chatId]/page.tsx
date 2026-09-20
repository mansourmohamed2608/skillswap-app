"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import ConversationListPanel from "@/features/chat/components/ConversationListPanel";
import ActiveConversationPanel from "@/features/chat/components/ActiveConversationPanel";

type Params = { chatId: string };
type ChatMeta = { name: string; avatarUrl?: string; username?: string };

export default function ChatDetailPage({ params }: { params: Params | Promise<Params> }) {
  const { t } = useTranslation();
  const resolvedParams = use(Promise.resolve(params));
  const chatId = resolvedParams.chatId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = String(searchParams.get('listing') || '').trim();
  const listingOwnerName = String(searchParams.get('name') || '').trim();
  const [selectedMeta, setSelectedMeta] = useState<ChatMeta | null>(null);

  const handleSelectChat = useCallback((chat: {
    id: string; otherId: string; title: string; subtitle: string;
    targetIdentifier: string; available: boolean; avatarUrl?: string;
  }) => {
    setSelectedMeta({ name: chat.title, avatarUrl: chat.avatarUrl, username: chat.subtitle.replace(/^@/, "") || undefined });
    router.push(`/chat/${encodeURIComponent(chat.id)}`);
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{t('chat.page.title', 'Chat')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">{t('chat.detail.back')}</p>
      </header>
      {listingId ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('chat.detail.listingContext', {
              name: listingOwnerName || t('listings.actions.ownerFallback'),
              defaultValue: `Messaging about a listing from ${listingOwnerName || 'this member'}.`,
            })}
          </p>
          <Link className="font-medium text-primary underline underline-offset-4" href={`/listings/${encodeURIComponent(listingId)}`}>
            {t('listings.card.viewDetails')}
          </Link>
        </div>
      ) : null}
      <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-[22rem,1fr]">
        <ConversationListPanel
          activeChatId={chatId}
          className="hidden min-h-0 border-r bg-background md:flex"
          onSelectChat={handleSelectChat}
        />
        <ActiveConversationPanel
          chatId={chatId}
          showBackButton
          initialUserMeta={selectedMeta ?? (listingOwnerName ? { name: listingOwnerName } : undefined)}
          className="grid h-full min-h-0 grid-rows-[auto,1fr,auto] rounded-none border-0 shadow-none"
        />
      </div>
    </div>
  );
}
