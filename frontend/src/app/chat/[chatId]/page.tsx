"use client";

import { use } from "react";
import ConversationListPanel from "@/features/chat/components/ConversationListPanel";
import ActiveConversationPanel from "@/features/chat/components/ActiveConversationPanel";

type Params = { chatId: string };

export default function ChatDetailPage({ params }: { params: Params | Promise<Params> }) {
  const resolvedParams = use(Promise.resolve(params));
  const chatId = resolvedParams.chatId;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid h-[calc(100dvh-9rem)] min-h-[34rem] overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-[22rem,1fr]">
        <ConversationListPanel activeChatId={chatId} className="hidden min-h-0 border-r bg-background md:flex" />
        <ActiveConversationPanel
          chatId={chatId}
          showBackButton
          className="grid h-full min-h-0 grid-rows-[auto,1fr,auto] rounded-none border-0 shadow-none"
        />
      </div>
    </div>
  );
}
