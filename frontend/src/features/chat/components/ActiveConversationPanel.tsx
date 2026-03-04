"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, SearchIcon, UserIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useMessagesRTDB, conversationIdWith } from "@/services/chatRTDB";
import { markConversationRead, sendChatMessage } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { getUserById, getUserByIdentifier } from "@/services/data";
import { rtdb } from "@/services/firebase";
import { onValue, ref } from "firebase/database";
import { getProfilePath } from "@/lib/profile";

type ActiveConversationPanelProps = {
  chatId: string;
  showBackButton?: boolean;
  backHref?: string;
  className?: string;
  onClose?: () => void;
  onBack?: () => void;
};

export function ActiveConversationPanel({
  chatId,
  showBackButton = false,
  backHref = "/chat",
  className,
  onClose,
  onBack,
}: ActiveConversationPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [otherUsername, setOtherUsername] = useState("");
  const [otherAvatarUrl, setOtherAvatarUrl] = useState("");
  const [presence, setPresence] = useState<"online" | "offline" | "unknown">("unknown");
  const [profileLink, setProfileLink] = useState<string>("");
  const [resolvingUser, setResolvingUser] = useState(true);

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

  function prettyIdentifierLabel(value: string) {
    const raw = String(value || "").trim().replace(/^@+/, "");
    if (!raw) return "";
    const withoutSuffix = raw.replace(/-[a-z0-9]{6}$/i, "");
    return withoutSuffix
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  async function onSend() {
    if (!user?.uid || !resolvedOtherUserId || !text.trim()) return;
    try {
      await sendChatMessage({ recipientId: resolvedOtherUserId, text: text.trim() });
      setText("");
    } catch (e: any) {
      toast({
        title: t("chat.detail.sendFailed"),
        description: getErrorMessage(e, t("chat.detail.sendFailed")),
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) setResolvingUser(true);
      if (!user?.uid) {
        // Auth still loading — keep resolvingUser=true so we don't flash "User unavailable"
        if (authLoading) return;
        if (active) {
          setResolvedOtherUserId("");
          setResolvingUser(false);
        }
        return;
      }
      if (parsedConversationId?.otherUserId) {
        if (active) {
          setResolvedOtherUserId(parsedConversationId.otherUserId);
        }
        return;
      }
      const raw = String(chatId || "").trim();
      if (!raw) {
        if (active) {
          setResolvedOtherUserId("");
          setResolvingUser(false);
        }
        return;
      }
      const resolved = await getUserByIdentifier(raw);
      if (!active) return;
      const nextUid = String(resolved?.id || "").trim();
      setResolvedOtherUserId(nextUid);
      setOtherUserName(String(resolved?.name || "").trim() || t("chat.detail.unavailable"));
      setOtherUsername(String(resolved?.username || "").trim());
      setOtherAvatarUrl(String(resolved?.avatarUrl || "").trim());
      setProfileLink(resolved ? getProfilePath(resolved) : "");
      setResolvingUser(false);
    })();
    return () => {
      active = false;
    };
  }, [chatId, parsedConversationId?.otherUserId, t, user?.uid, authLoading]);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!resolvedOtherUserId) return;
      try {
        const profile = await getUserById(resolvedOtherUserId);
        if (!active) return;
        if (profile) {
          setOtherUserName(profile.name || t("chat.detail.unavailable"));
          setOtherUsername(String(profile.username || "").trim());
          setOtherAvatarUrl(String(profile.avatarUrl || "").trim());
          setProfileLink(getProfilePath(profile));
        }
      } catch {
        if (active) setOtherUserName((prev) => prev || t("chat.detail.unavailable"));
      } finally {
        if (active) setResolvingUser(false);
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, [resolvedOtherUserId, t]);

  useEffect(() => {
    if (!rtdb || !resolvedOtherUserId) {
      setPresence("unknown");
      return;
    }
    const pRef = ref(rtdb, `presence/${resolvedOtherUserId}`);
    const unsub = onValue(pRef, (snap) => {
      const state = String(snap.val()?.state || "").toLowerCase();
      if (state === "online") setPresence("online");
      else if (state === "offline") setPresence("offline");
      else setPresence("unknown");
    });
    return () => unsub();
  }, [resolvedOtherUserId]);

  useEffect(() => {
    if (!convId || !user?.uid) return;
    markConversationRead(convId).catch(() => {});
  }, [convId, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const provisionalName = parsedConversationId?.otherUserId
    ? otherUserName || otherUsername || ""
    : prettyIdentifierLabel(decodeURIComponent(String(chatId || "")).trim());
  const headerName = otherUserName || (resolvingUser ? provisionalName || t("chat.newChat.searching") : t("chat.detail.unavailable"));
  const headerInitial = headerName.slice(0, 1).toUpperCase();
  const presenceText =
    resolvingUser || authLoading
      ? ""
      : !resolvedOtherUserId
        ? t("chat.detail.unavailable")
        : presence === "online"
          ? t("chat.detail.online")
          : presence === "offline"
            ? t("chat.detail.offline")
            : t("chat.detail.unavailable");

  return (
    <Card className={className}>
      <CardHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            onBack ? (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="sr-only">{t("chat.detail.back")}</span>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" asChild>
                <Link href={backHref} onClick={onClose}>
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span className="sr-only">{t("chat.detail.back")}</span>
                </Link>
              </Button>
            )
          ) : null}
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherAvatarUrl} alt={headerName} />
            <AvatarFallback>{headerInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle dir="auto" className="truncate text-lg text-start" title={headerName}>{headerName}</CardTitle>
            <p dir="auto" className="truncate text-xs text-muted-foreground text-start">
              {otherUsername ? `@${otherUsername} • ` : ""}{presenceText}
            </p>
          </div>
          {profileLink ? (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={profileLink} onClick={onClose}>
                <UserIcon className="mr-2 h-4 w-4" />
                {t("profile.public.viewProfile", { defaultValue: "View profile" })}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 overflow-y-auto bg-muted/20 p-3 sm:p-4">
        {!user && (
          <div className="text-sm text-muted-foreground">{t("chat.detail.signInPrompt")}</div>
        )}
        {user && !resolvedOtherUserId && !resolvingUser && !authLoading && (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p>{t("chat.detail.unavailable")}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/chat" onClick={onClose}>
                <SearchIcon className="mr-2 h-4 w-4" />
                Find a valid user
              </Link>
            </Button>
          </div>
        )}
        <div className="space-y-4">
          {user && messages.length === 0 && resolvedOtherUserId ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed bg-background/70 px-6 py-10 text-center">
              <p dir="auto" className="text-base font-semibold text-center" title={headerName}>{headerName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("chat.list.emptyBody")}</p>
            </div>
          ) : null}
          {user && messages.map((message) => (
            <div key={message.id} className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[75%] ${message.senderId === user?.uid ? "flex-row-reverse" : ""}`}>
                {message.senderId !== user?.uid ? (
                  <Avatar className="h-8 w-8 self-end">
                    <AvatarImage src={otherAvatarUrl} alt={headerName} />
                    <AvatarFallback>{headerInitial}</AvatarFallback>
                  </Avatar>
                ) : null}
                <div className={`rounded-2xl p-3 ${message.senderId === user?.uid ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card text-card-foreground"}`}>
                  <p dir="auto" className="text-sm leading-relaxed">{message.text}</p>
                  <p className={`mt-1 text-right text-xs ${message.senderId === user?.uid ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <CardFooter className="border-t bg-background p-3 sm:p-4">
        <div className="flex w-full gap-2">
          <Input
            className="flex-1"
            placeholder={t("chat.detail.messagePlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSend();
              }
            }}
            disabled={!user || !resolvedOtherUserId}
          />
          <Button className="shrink-0" onClick={onSend} disabled={!user || !resolvedOtherUserId || !text.trim()}>
            {t("chat.detail.send")}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ActiveConversationPanel;
