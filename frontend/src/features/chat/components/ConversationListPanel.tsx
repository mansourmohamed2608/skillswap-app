"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageCircleIcon, SearchIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import NewChatButton from "@/features/chat/components/NewChatButton";
import { useConversationsRTDB } from "@/services/chatRTDB";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { getUserById } from "@/services/data";
import { getProfileIdentifier } from "@/lib/profile";
import { cn } from "@/lib/utils";

type ConversationListPanelProps = {
  activeChatId?: string;
  className?: string;
  showHeader?: boolean;
};

export function ConversationListPanel({
  activeChatId,
  className,
  showHeader = true,
}: ConversationListPanelProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const convs = useConversationsRTDB();
  const [searchText, setSearchText] = useState("");
  const [userMetaById, setUserMetaById] = useState<Record<string, { name: string; username?: string; identifier: string }>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      const otherIds = Array.from(new Set(
        convs.map((c) => Object.keys(c.participants || {}).find((p) => p !== user?.uid) || "")
          .filter(Boolean)
      ));
      if (!otherIds.length) {
        if (mounted) {
          setUserMetaById({});
          setLoadingUsers(false);
        }
        return;
      }
      const entries: Record<string, { name: string; username?: string; identifier: string }> = {};
      await Promise.all(otherIds.map(async (uid) => {
        try {
          const profile = await getUserById(uid);
          if (profile) {
            entries[uid] = {
              name: profile.name,
              username: profile.username,
              identifier: getProfileIdentifier(profile),
            };
          }
        } catch {}
      }));
      if (mounted) {
        setUserMetaById(entries);
        setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [convs, user?.uid]);

  const chats = useMemo(() => {
    const formatTimestamp = (value?: number) => {
      if (!value) return "";
      const date = new Date(value);
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      return sameDay
        ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const normalizedActive = decodeURIComponent(String(activeChatId || "")).trim().toLowerCase();
    const rows = convs.map((c) => {
      const otherId = Object.keys(c.participants || {}).find((p) => p !== user?.uid) || "";
      const profileMeta = userMetaById[otherId];
      const title = profileMeta?.name || t("chat.detail.unavailable");
      const subtitle = profileMeta?.username ? `@${profileMeta.username}` : "";
      const targetIdentifier = profileMeta?.identifier || otherId;
      return {
        id: c.id as string,
        otherId,
        title,
        subtitle,
        targetIdentifier,
        lastMessage: (c.lastMessage as string) || "",
        unread: (c.lastMessageAt && user?.uid && c.lastMessageAt > Number(c.perUserLastReadAt?.[user.uid] || 0)) ? 1 : 0,
        timestamp: formatTimestamp(c.lastMessageAt),
        available: Boolean(profileMeta?.identifier),
        active: Boolean(
          normalizedActive &&
          (String(c.id).toLowerCase() === normalizedActive || String(targetIdentifier).toLowerCase() === normalizedActive)
        ),
      };
    });
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.lastMessage.toLowerCase().includes(q)
    );
  }, [activeChatId, convs, searchText, t, user?.uid, userMetaById]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {showHeader ? (
        <div className="border-b p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="flex items-center text-2xl font-semibold">
              <MessageCircleIcon className="mr-3 h-7 w-7 text-primary" />
              {t("chat.list.title")}
            </h1>
            <NewChatButton />
          </div>
          <div className="relative mt-4">
            <Input
              placeholder={t("chat.list.searchPlaceholder")}
              className="pl-10"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingUsers ? (
          <div className="p-4 text-sm text-muted-foreground">{t("chat.newChat.searching")}</div>
        ) : null}
        {chats.length > 0 ? (
          <ul className="divide-y">
            {chats.map((chat) => (
              <li key={chat.id}>
                {chat.available ? (
                  <Link
                    href={`/chat/${encodeURIComponent(chat.targetIdentifier)}`}
                    className={cn(
                      "block transition-colors hover:bg-muted/50",
                      chat.active && "bg-muted/60"
                    )}
                  >
                    <div className="flex items-center space-x-4 p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{chat.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-md font-semibold">{chat.title}</p>
                            {chat.subtitle ? (
                              <p className="truncate text-xs text-muted-foreground">{chat.subtitle}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">{chat.timestamp}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
                          {chat.unread > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-1 text-xs font-bold leading-none text-accent-foreground">
                              {chat.unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center space-x-4 p-4 opacity-70">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{chat.title.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-md font-semibold">{chat.title}</p>
                          {chat.subtitle ? (
                            <p className="truncate text-xs text-muted-foreground">{chat.subtitle}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">{chat.timestamp}</p>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center p-10 text-center">
            <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-xl font-semibold">{t("chat.list.emptyTitle")}</h3>
            <p className="mt-1 text-muted-foreground">{t("chat.list.emptyBody")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationListPanel;
