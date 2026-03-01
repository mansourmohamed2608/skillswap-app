"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { getUnreadConversationCount, useConversationsRTDB } from "@/services/chatRTDB";
import { useTranslation } from "react-i18next";
import ConversationListPanel from "@/features/chat/components/ConversationListPanel";
import ActiveConversationPanel from "@/features/chat/components/ActiveConversationPanel";
import NewChatButton from "@/features/chat/components/NewChatButton";

export function FloatingChatButton() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();
  const conversations = useConversationsRTDB();
  const unreadChats = getUnreadConversationCount(conversations, user?.uid);
  const [open, setOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [isDesktop, setIsDesktop] = useState(false);

  const panelTitle = useMemo(() => {
    if (activeChatId) return t("header.chat");
    return t("chat.list.title");
  }, [activeChatId, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!user?.uid) return null;
  if (pathname?.startsWith("/chat")) return null;

  const listHeaderAction = (
    <div className="flex items-center gap-2">
      <NewChatButton onStartChat={(identifier) => setActiveChatId(identifier)} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-9 w-9 shrink-0"
        aria-label={t("reports.cancel", { defaultValue: "Close" })}
        onClick={() => {
          setOpen(false);
          setActiveChatId("");
        }}
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 hidden sm:block">
        <Button
          type="button"
          size="lg"
          className="relative h-14 rounded-full px-5 shadow-lg"
          onClick={() => setOpen((value) => !value)}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">{t("header.chat")}</span>
          {unreadChats > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-accent-foreground">
              {unreadChats > 99 ? "99+" : unreadChats}
            </span>
          ) : null}
        </Button>
        {isDesktop && open ? (
          <Card className={`absolute bottom-16 right-0 overflow-hidden border shadow-2xl ${activeChatId ? "h-[38rem] w-[58rem]" : "h-[38rem] w-[24rem]"}`}>
            <div className={`grid h-full min-h-0 ${activeChatId ? "grid-cols-[22rem,1fr]" : "grid-cols-1"}`}>
              <ConversationListPanel
                activeChatId={activeChatId}
                className={`min-h-0 bg-background ${activeChatId ? "border-r" : ""}`}
                headerAction={listHeaderAction}
                onSelectChat={(chat) => setActiveChatId(chat.targetIdentifier)}
              />
              {activeChatId ? (
                <ActiveConversationPanel
                  chatId={activeChatId}
                  className="grid h-full min-h-0 grid-rows-[auto,1fr,auto] rounded-none border-0 shadow-none"
                />
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>

      <div className="fixed bottom-5 right-5 z-40 sm:hidden">
        <Button
          type="button"
          size="lg"
          className="relative h-14 rounded-full px-5 shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-5 w-5" />
          {unreadChats > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-1 text-[11px] font-bold leading-none text-accent-foreground">
              {unreadChats > 99 ? "99+" : unreadChats}
            </span>
          ) : null}
        </Button>
      </div>
      <Sheet open={!isDesktop && open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) setActiveChatId("");
      }}>
        <SheetContent side="bottom" className="h-[88dvh] p-0 sm:hidden">
          <div className="flex h-full min-h-0 flex-col">
            {!activeChatId ? (
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-base font-semibold">{panelTitle}</div>
                <NewChatButton onStartChat={(identifier) => setActiveChatId(identifier)} />
              </div>
            ) : null}
            <div className="min-h-0 flex-1">
              {activeChatId ? (
                <ActiveConversationPanel
                  chatId={activeChatId}
                  className="grid h-full min-h-0 grid-rows-[auto,1fr,auto] rounded-none border-0 shadow-none"
                  onClose={() => setOpen(false)}
                  showBackButton
                  onBack={() => setActiveChatId("")}
                />
              ) : (
                <ConversationListPanel
                  className="min-h-0 bg-background"
                  showHeader={false}
                  onSelectChat={(chat) => setActiveChatId(chat.targetIdentifier)}
                />
              )}
            </div>
            <div className="border-t px-4 py-3">
              <Button asChild variant="outline" className="w-full">
                <Link href="/chat" onClick={() => setOpen(false)}>
                  {t("chat.list.title")}
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default FloatingChatButton;
