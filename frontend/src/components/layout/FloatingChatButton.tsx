"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUnreadConversationCount, useConversationsRTDB } from "@/services/chatRTDB";
import { useTranslation } from "react-i18next";

export function FloatingChatButton() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();
  const conversations = useConversationsRTDB();
  const unreadChats = getUnreadConversationCount(conversations, user?.uid);

  if (!user?.uid) return null;
  if (pathname?.startsWith("/chat")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <Button
        asChild
        size="lg"
        className="relative h-14 rounded-full px-5 shadow-lg"
      >
        <Link href="/chat" className="inline-flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">{t("header.chat")}</span>
          {unreadChats > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-accent-foreground">
              {unreadChats > 99 ? "99+" : unreadChats}
            </span>
          ) : null}
        </Link>
      </Button>
    </div>
  );
}

export default FloatingChatButton;
