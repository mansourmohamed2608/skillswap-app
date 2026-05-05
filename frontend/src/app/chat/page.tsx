"use client";

import ConversationListPanel from "@/features/chat/components/ConversationListPanel";
import { MessageCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ChatPage() {
  const { t } = useTranslation();

  return (
    <div className="relative z-0 mx-auto max-w-6xl">
      <div className="grid h-[calc(100dvh-9rem)] min-h-[34rem] overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-[22rem,1fr]">
        <ConversationListPanel className="min-h-0 border-r bg-background" />
        <div className="hidden min-h-0 flex-col items-center justify-center bg-muted/10 p-10 text-center md:flex">
          <div className="rounded-full bg-primary/10 p-5 text-primary">
            <MessageCircleIcon className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">{t("chat.list.title")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("chat.list.emptyBody")}
          </p>
        </div>
      </div>
    </div>
  );
}
