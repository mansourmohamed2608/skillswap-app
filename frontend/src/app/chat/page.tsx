"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircleIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import NewChatButton from "@/features/chat/components/NewChatButton";
import { useConversationsRTDB } from '@/services/chatRTDB';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from "react-i18next";
import { getUserById } from "@/services/data";
import { getProfileIdentifier } from "@/lib/profile";

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const convs = useConversationsRTDB();
  const [searchText, setSearchText] = useState('');
  const [userMetaById, setUserMetaById] = useState<Record<string, { name: string; username?: string; identifier: string }>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      const otherIds = Array.from(new Set(
        convs.map((c) => Object.keys(c.participants || {}).find((p) => p !== user?.uid) || '')
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
      if (!value) return '';
      const date = new Date(value);
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      return sameDay
        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    const rows = convs.map((c) => {
      const otherId = Object.keys(c.participants || {}).find((p) => p !== user?.uid) || '';
      const profileMeta = userMetaById[otherId];
      const title = profileMeta?.name || t('chat.detail.unavailable');
      const subtitle = profileMeta?.username ? `@${profileMeta.username}` : '';
      return {
        id: c.id as string,
        otherId,
        title,
        subtitle,
        targetIdentifier: profileMeta?.identifier || otherId,
        lastMessage: (c.lastMessage as string) || '',
        unread: (c.lastMessageAt && user?.uid && c.lastMessageAt > Number(c.perUserLastReadAt?.[user.uid] || 0)) ? 1 : 0,
        timestamp: formatTimestamp(c.lastMessageAt),
        available: Boolean(profileMeta?.identifier),
      };
    });
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.lastMessage.toLowerCase().includes(q)
    );
  }, [convs, user?.uid, userMetaById, t, searchText]);

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-2xl flex items-center">
              <MessageCircleIcon className="mr-3 h-7 w-7 text-primary" />
              {t('chat.list.title')}
            </CardTitle>
            <NewChatButton />
          </div>
          <div className="mt-4 relative">
            <Input
              placeholder={t('chat.list.searchPlaceholder')}
              className="pl-10"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="p-4 text-sm text-muted-foreground">{t('chat.newChat.searching')}</div>
          ) : null}
          {chats.length > 0 ? (
            <ul className="divide-y">
              {chats.map(chat => (
                <li key={chat.id}>
                  {chat.available ? (
                    <Link href={`/chat/${chat.targetIdentifier}`} className="block hover:bg-muted/50 transition-colors">
                      <div className="p-4 flex items-center space-x-4">
                        <Avatar className="h-12 w-12"><AvatarFallback>{chat.title.slice(0,1).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1 gap-3">
                            <div className="min-w-0">
                              <p className="text-md font-semibold truncate">{chat.title}</p>
                              {chat.subtitle ? (
                                <p className="text-xs text-muted-foreground truncate">{chat.subtitle}</p>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground shrink-0">{chat.timestamp}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                            {chat.unread > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-accent-foreground bg-accent rounded-full">
                                {chat.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="p-4 flex items-center space-x-4 opacity-70">
                      <Avatar className="h-12 w-12"><AvatarFallback>{chat.title.slice(0,1).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-3">
                          <div className="min-w-0">
                            <p className="text-md font-semibold truncate">{chat.title}</p>
                            {chat.subtitle ? (
                              <p className="text-xs text-muted-foreground truncate">{chat.subtitle}</p>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0">{chat.timestamp}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-10 text-center">
              <MessageCircleIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-xl font-semibold">{t('chat.list.emptyTitle')}</h3>
              <p className="mt-1 text-muted-foreground">{t('chat.list.emptyBody')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
