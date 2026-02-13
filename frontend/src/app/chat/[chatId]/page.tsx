"use client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMessagesRTDB, conversationIdWith } from "@/services/chatRTDB";
import { useEffect, useMemo, useState, use } from "react";
import { db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { markConversationRead, sendChatMessage } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

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
  const { convId, otherUserId } = useMemo(() => {
    if (!user?.uid) return { convId: undefined, otherUserId: chatId };
    if (chatId.includes("_")) {
      const parts = chatId.split("_");
      if (parts.length === 2 && parts.includes(user.uid)) {
        const otherId = parts[0] === user.uid ? parts[1] : parts[0];
        return { convId: chatId, otherUserId: otherId };
      }
    }
    return { convId: conversationIdWith(chatId, user.uid), otherUserId: chatId };
  }, [chatId, user?.uid]);
  const messages = useMessagesRTDB(convId);
  const [text, setText] = useState("");
  const initialName =
    typeof resolvedSearch?.name === "string"
      ? decodeURIComponent(resolvedSearch.name)
      : Array.isArray(resolvedSearch?.name)
        ? decodeURIComponent(resolvedSearch?.name[0] || "")
        : "";
  const [otherUserName, setOtherUserName] = useState<string>(initialName);

  async function onSend() {
    if (!user?.uid || !otherUserId || !text.trim()) return;
    try {
      await sendChatMessage({ recipientId: otherUserId, text: text.trim() });
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
    async function loadUser() {
      if (!db || !otherUserId) return;
      try {
        const snap = await getDoc(doc(db, "users", otherUserId));
        if (!active) return;
        if (snap.exists()) {
          const d = snap.data() as any;
          setOtherUserName(d.name || d.fullName || d.displayName || otherUserId);
        } else {
          setOtherUserName((prev) => prev || otherUserId);
        }
      } catch {
        if (active) setOtherUserName((prev) => prev || otherUserId);
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, [otherUserId]);

  useEffect(() => {
    if (!convId || !user?.uid) return;
    markConversationRead(convId).catch(() => {});
  }, [convId, user?.uid]);

  const headerName = otherUserName || chatId;
  const headerInitial = headerName.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto"> {/* Adjust height as needed */}
      <Card className="flex-1 flex flex-col shadow-xl">
        <CardHeader className="border-b p-4">
          <div className="flex items-center space-x-3">
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
              <p className="text-xs text-muted-foreground">{t('chat.detail.online')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {!user && (
            <div className="text-sm text-muted-foreground">{t('chat.detail.signInPrompt')}</div>
          )}
          {user && messages.map(message => (
            <div key={message.id} className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-end gap-2 max-w-[75%] ${message.senderId === user?.uid ? "flex-row-reverse" : ""}`}>
                {message.senderId !== user?.uid && (
                   <Avatar className="h-8 w-8 self-end">
                  <AvatarFallback>{(otherUserId || chatId).slice(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`p-3 rounded-xl ${message.senderId === user?.uid ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground border rounded-bl-none"}`}>
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground"} text-right`}>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder={t('chat.detail.messagePlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSend(); } }}
              disabled={!user}
            />
            <Button onClick={onSend} disabled={!user || !text.trim()}>{t('chat.detail.send')}</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
