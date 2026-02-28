"use client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMessagesRTDB, conversationIdWith } from "@/services/chatRTDB";
import { useEffect, useMemo, useState, use } from "react";
import { rtdb } from "@/services/firebase";
import { useTranslation } from "react-i18next";
import { markConversationRead, sendChatMessage } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { getUserById, getUserByIdentifier } from "@/services/data";
import { onValue, ref } from "firebase/database";

type Params = { chatId: string };
type Search = { [key: string]: string | string[] | undefined };

function unwrapMaybePromise<T>(value: T | Promise<T>): T {
  return (typeof (value as any)?.then === "function") ? use(value as Promise<T>) : (value as T);
}

export default function ChatDetailPage({ params, searchParams }: { params: Params | Promise<Params>; searchParams?: Search | Promise<Search> }) {
  const resolvedParams = unwrapMaybePromise(params);
  const resolvedSearch = searchParams ? unwrapMaybePromise(searchParams) : {};
  const chatId = resolvedParams.chatId;
  const { t } = useTranslation();
  const { toast } = useToast();

  const { user } = useAuth();
  const parsedConversationId = useMemo(() => {
    if (!user?.uid) return null;
    if (!chatId.includes("_")) return null;
    const parts = chatId.split("_");
    if (parts.length !== 2 || !parts.includes(user.uid)) return null;
    const otherId = parts[0] === user.uid ? parts[1] : parts[0];
    return { convId: chatId, otherUserId: otherId };
  }, [chatId, user?.uid]);
  const [resolvedOtherUserId, setResolvedOtherUserId] = useState<string>(parsedConversationId?.otherUserId || "");
  const convId = useMemo(() => {
    if (!user?.uid) return undefined;
    if (parsedConversationId?.convId) return parsedConversationId.convId;
    if (!resolvedOtherUserId) return undefined;
    return conversationIdWith(resolvedOtherUserId, user.uid);
  }, [parsedConversationId?.convId, resolvedOtherUserId, user?.uid]);
  const messages = useMessagesRTDB(convId);
  const [text, setText] = useState("");
  const initialName =
    typeof resolvedSearch?.name === "string"
      ? decodeURIComponent(resolvedSearch.name)
      : Array.isArray(resolvedSearch?.name)
        ? decodeURIComponent(resolvedSearch?.name[0] || "")
        : "";
  const [otherUserName, setOtherUserName] = useState<string>(initialName);
  const [otherUsername, setOtherUsername] = useState<string>("");
  const [presence, setPresence] = useState<'online' | 'offline' | 'unknown'>('unknown');

  async function onSend() {
    if (!user?.uid || !resolvedOtherUserId || !text.trim()) return;
    try {
      await sendChatMessage({ recipientId: resolvedOtherUserId, text: text.trim() });
      setText("");
    } catch (e: any) {
      toast({
        title: t('chat.detail.sendFailed'),
        description: getErrorMessage(e, t('chat.detail.sendFailed')),
        variant: 'destructive',
      });
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.uid) {
        if (active) setResolvedOtherUserId("");
        return;
      }
      if (parsedConversationId?.otherUserId) {
        if (active) setResolvedOtherUserId(parsedConversationId.otherUserId);
        return;
      }
      const raw = String(chatId || '').trim();
      if (!raw) {
        if (active) setResolvedOtherUserId("");
        return;
      }
      const resolved = await getUserByIdentifier(raw);
      if (!active) return;
      const nextUid = String(resolved?.id || '').trim();
      setResolvedOtherUserId(nextUid);
      if (resolved?.name) setOtherUserName(resolved.name);
      setOtherUsername(String(resolved?.username || '').trim());
      if (!nextUid) {
        setOtherUserName(t('chat.detail.unavailable'));
        setOtherUsername('');
      }
    })();
    return () => {
      active = false;
    };
  }, [chatId, parsedConversationId?.otherUserId, user?.uid, t]);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!resolvedOtherUserId) return;
      try {
        const profile = await getUserById(resolvedOtherUserId);
        if (!active) return;
        if (profile?.name) setOtherUserName(profile.name);
        setOtherUsername(String(profile?.username || '').trim());
        if (!profile?.name) setOtherUserName((prev) => prev || t('chat.detail.unavailable'));
      } catch {
        if (active) setOtherUserName((prev) => prev || t('chat.detail.unavailable'));
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, [resolvedOtherUserId, t]);

  useEffect(() => {
    if (!rtdb || !resolvedOtherUserId) {
      setPresence('unknown');
      return;
    }
    const pRef = ref(rtdb, `presence/${resolvedOtherUserId}`);
    const unsub = onValue(pRef, (snap) => {
      const state = String(snap.val()?.state || '').toLowerCase();
      if (state === 'online') setPresence('online');
      else if (state === 'offline') setPresence('offline');
      else setPresence('unknown');
    });
    return () => unsub();
  }, [resolvedOtherUserId]);

  useEffect(() => {
    if (!convId || !user?.uid) return;
    markConversationRead(convId).catch(() => {});
  }, [convId, user?.uid]);

  const headerName = otherUserName || t('chat.detail.unavailable');
  const headerInitial = headerName.slice(0, 1).toUpperCase();
  const presenceText =
    !resolvedOtherUserId
      ? t('chat.detail.unavailable')
      : presence === 'online'
      ? t('chat.detail.online')
      : presence === 'offline'
        ? t('chat.detail.offline')
        : t('chat.detail.unavailable');

  return (
    <div className="flex flex-col min-h-[calc(100vh-10rem)] max-w-3xl mx-auto">
      <Card className="flex-1 flex flex-col shadow-xl">
        <CardHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/chat">
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="sr-only">{t('chat.detail.back')}</span>
              </Link>
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarFallback>{headerInitial}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{headerName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {otherUsername ? `@${otherUsername} • ` : ''}{presenceText}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-muted/20">
          {!user && (
            <div className="text-sm text-muted-foreground">{t('chat.detail.signInPrompt')}</div>
          )}
          {user && !resolvedOtherUserId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-3">
              <p>{t('chat.detail.unavailable')}</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/chat">
                  <SearchIcon className="mr-2 h-4 w-4" />
                  Find a valid user
                </Link>
              </Button>
            </div>
          )}
          {user && messages.map(message => (
            <div key={message.id} className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-end gap-2 max-w-[88%] sm:max-w-[75%] ${message.senderId === user?.uid ? "flex-row-reverse" : ""}`}>
                {message.senderId !== user?.uid && (
                   <Avatar className="h-8 w-8 self-end">
                  <AvatarFallback>{headerInitial}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`p-3 rounded-xl ${message.senderId === user?.uid ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground border rounded-bl-none"}`}>
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground"} text-right`}>
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-3 sm:p-4 border-t">
          <div className="flex w-full gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder={t('chat.detail.messagePlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSend(); } }}
              disabled={!user || !resolvedOtherUserId}
            />
            <Button className="shrink-0" onClick={onSend} disabled={!user || !resolvedOtherUserId || !text.trim()}>{t('chat.detail.send')}</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
