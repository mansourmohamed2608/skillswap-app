"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircleIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import NewChatButton from "@/features/chat/components/NewChatButton";
import { useConversationsRTDB } from '@/services/chatRTDB';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';
import { useTranslation } from "react-i18next";

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const convs = useConversationsRTDB();
  const chats = useMemo(() => {
    return convs.map((c) => {
      const otherId = Object.keys(c.participants || {}).find((p) => p !== user?.uid) || '';
      return {
        id: c.id as string,
        otherId,
        title: (c.title as string) || otherId || t('chat.list.conversationFallback'),
        lastMessage: (c.lastMessage as string) || '',
        unread: (c.lastMessageAt && user?.uid && c.perUserLastReadAt?.[user.uid] && c.lastMessageAt > c.perUserLastReadAt[user.uid]) ? 1 : 0,
        timestamp: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : '',
      };
    });
  }, [convs, user?.uid]);

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center">
              <MessageCircleIcon className="mr-3 h-7 w-7 text-primary" />
              {t('chat.list.title')}
            </CardTitle>
            <NewChatButton />
          </div>
          <div className="mt-4 relative">
            <Input placeholder={t('chat.list.searchPlaceholder')} className="pl-10" />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {chats.length > 0 ? (
            <ul className="divide-y">
              {chats.map(chat => (
                <li key={chat.id}>
                  <Link href={`/chat/${chat.otherId || chat.id}`} className="block hover:bg-muted/50 transition-colors">
                    <div className="p-4 flex items-center space-x-4">
                      <Avatar className="h-12 w-12"><AvatarFallback>{chat.title.slice(0,1).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-md font-semibold truncate">{chat.title}</p>
                          <p className="text-xs text-muted-foreground">{chat.timestamp}</p>
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
