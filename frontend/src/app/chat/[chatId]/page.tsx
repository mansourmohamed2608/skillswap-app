"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConversationListPanel from "@/features/chat/components/ConversationListPanel";
import ActiveConversationPanel from "@/features/chat/components/ActiveConversationPanel";

type Params = { chatId: string };
type ChatMeta = { name: string; avatarUrl?: string; username?: string };

export default function ChatDetailPage({ params }: { params: Params | Promise<Params> }) {
  const resolvedParams = use(Promise.resolve(params));
  const chatId = resolvedParams.chatId;
  const router = useRouter();
  const [selectedMeta, setSelectedMeta] = useState<ChatMeta | null>(null);

  const handleSelectChat = useCallback((chat: {
    id: string; otherId: string; title: string; subtitle: string;
    targetIdentifier: string; available: boolean; avatarUrl?: string;
  }) => {
    setSelectedMeta({ name: chat.title, avatarUrl: chat.avatarUrl, username: chat.subtitle.replace(/^@/, "") || undefined });
    router.push(`/chat/${encodeURIComponent(chat.id)}`);
  }, [router]);

  return (
    <div className="flex flex-col h-full">
      <div className="grid flex-1 min-h-0 overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-[22rem,1fr]">
        <ConversationListPanel
          activeChatId={chatId}
          className="hidden min-h-0 border-r bg-background md:flex"
          onSelectChat={handleSelectChat}
        />
        <ActiveConversationPanel
          chatId={chatId}
          showBackButton
          initialUserMeta={selectedMeta ?? undefined}
          className="grid h-full min-h-0 grid-rows-[auto,1fr,auto] rounded-none border-0 shadow-none"
        />
      </div>
    </div>
  );
}
