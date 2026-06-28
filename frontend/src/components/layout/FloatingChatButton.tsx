"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
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
  const reduced = useReducedMotion();
  const conversations = useConversationsRTDB();
  const unreadChats = getUnreadConversationCount(conversations, user?.uid);
  const [open, setOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  const panelTitle = useMemo(() => {
    if (activeChatId) return t("header.chat");
    return t("chat.list.title");
  }, [activeChatId, t]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('has-floating-chat');
    return () => {
      document.body.classList.remove('has-floating-chat');
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    const id = requestAnimationFrame(update);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(id);
      media.removeEventListener("change", update);
    };
  }, []);

  if (!user?.uid) return null;
  if (pathname?.startsWith("/chat")) return null;

  const chatLabel = t("chat.open", "Open chat");

  const listHeaderAction = (
    <div className="flex items-center gap-2">
      <NewChatButton compact onStartChat={(identifier) => setActiveChatId(identifier)} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9 shrink-0"
        aria-label={t("reports.cancel", { defaultValue: "Close" })}
        onClick={() => {
          setOpen(false);
          setActiveChatId("");
        }}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );

  const fab = (
    <motion.div
      className="app-floating-chat"
      initial={false}
      whileTap={reduced ? undefined : { scale: 0.94 }}
    >
      <Button
        type="button"
        size="icon"
        className="app-floating-chat-btn relative size-[var(--floating-chat-size)] rounded-full bg-[#3f7752] text-white shadow-lg hover:bg-[#3f7752]/90 focus-visible:ring-2 focus-visible:ring-[#3f7752]/40"
        onClick={() => setOpen((value) => (isDesktop ? !value : true))}
        aria-label={chatLabel}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        {unreadChats > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d4642f] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadChats > 99 ? "99+" : unreadChats}
          </span>
        ) : null}
      </Button>

      {isDesktop && open ? (
        <Card className={`absolute bottom-[calc(100%+12px)] end-0 overflow-hidden border shadow-2xl ${activeChatId ? "h-[38rem] w-[58rem]" : "h-[38rem] w-[24rem]"}`}>
          <div className={`grid h-full min-h-0 ${activeChatId ? "grid-cols-[22rem,1fr]" : "grid-cols-1"}`}>
            <ConversationListPanel
              activeChatId={activeChatId}
              className={`min-h-0 bg-background ${activeChatId ? "border-e" : ""}`}
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
    </motion.div>
  );

  return (
    <>
      {mounted ? createPortal(fab, document.body) : null}

      <Sheet
        open={!isDesktop && open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setActiveChatId("");
        }}
      >
        <SheetContent side="bottom" className="z-[80] h-[88dvh] p-0 md:hidden">
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
              <Button asChild variant="outline" className="h-11 w-full">
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
