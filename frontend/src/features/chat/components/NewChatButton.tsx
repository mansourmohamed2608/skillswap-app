"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { getFunctionsBase } from "@/services/api";
import { getUserByIdentifier } from "@/services/data";
import { getProfileIdentifier } from "@/lib/profile";
import { useAuth } from "@/context/AuthContext";

type UserMatch = { uid: string; username?: string; name: string };

export function NewChatButton({ onStartChat }: { onStartChat?: (identifier: string) => void }) {
  const { active, canSendMessage, loading } = useMembership();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UserMatch | null>(null);
  const [matches, setMatches] = useState<UserMatch[]>([]);

  const normalizedQuery = useMemo(() => targetIdentifier.trim().replace(/^@+/, ''), [targetIdentifier]);

  useEffect(() => {
    if (!open) return;
    if (normalizedQuery.length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const base = getFunctionsBase();
        const url = base
          ? `${base}/api/user/search?q=${encodeURIComponent(normalizedQuery)}&limit=8`
          : `/api/user/search?q=${encodeURIComponent(normalizedQuery)}&limit=8`;
        const res = await fetch(url, { method: 'GET' });
        const data: any = await res.json().catch(() => ({}));
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setMatches(items.map((item: any) => ({
          uid: String(item?.uid || '').trim(),
          username: String(item?.username || '').trim() || undefined,
          name: String(item?.name || '').trim() || String(item?.username || '').trim() || t('chat.list.conversationFallback'),
        })).filter((item: any) => item.uid));
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedQuery, open, t]);

  function onClick() {
    if (loading) return;
    if (!active || !canSendMessage) {
      router.push('/pricing?alert=sub-required');
      return;
    }
    setOpen(true);
  }

  async function startChat() {
    const query = normalizedQuery;
    if (!query) {
      toast({ title: t('chat.newChat.missing'), variant: 'destructive' });
      return;
    }
    if (searching) return;

    const toChatIdentifier = (item: UserMatch) =>
      item.username || getProfileIdentifier({ id: item.uid, name: item.name, username: item.username });

    let nextIdentifier = selectedMatch ? toChatIdentifier(selectedMatch) : '';
    if (!nextIdentifier) {
      const exact = matches.find((item) =>
        item.username?.toLowerCase() === query.toLowerCase() ||
        item.name.toLowerCase() === query.toLowerCase()
      );
      if (exact) {
        nextIdentifier = toChatIdentifier(exact);
      }
    }
    if (!nextIdentifier && matches.length > 1) {
      toast({ title: t('chat.newChat.notFound'), description: t('chat.newChat.searching'), variant: 'destructive' });
      return;
    }
    if (!nextIdentifier) {
      const resolved = await getUserByIdentifier(query);
      if (resolved) {
        if (resolved.id && user?.uid && resolved.id === user.uid) {
          toast({ title: t('chat.newChat.notFound'), variant: 'destructive' });
          return;
        }
        nextIdentifier = getProfileIdentifier(resolved);
      }
    }
    if (!nextIdentifier) {
      toast({ title: t('chat.newChat.notFound'), variant: 'destructive' });
      return;
    }

    setOpen(false);
    setTargetIdentifier("");
    setSelectedMatch(null);
    setMatches([]);
    if (onStartChat) {
      onStartChat(nextIdentifier);
      return;
    }
    router.push(`/chat/${encodeURIComponent(nextIdentifier)}`);
  }

  return (
    <>
      <Button variant="outline" onClick={onClick}>
        <UserPlusIcon className="mr-2 h-4 w-4" /> {t('chat.list.newChat')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.newChat.title')}</DialogTitle>
            <DialogDescription>{t('chat.newChat.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="chat-user-id">
              Username
            </label>
            <Input
              id="chat-user-id"
              value={targetIdentifier}
              onChange={(e) => {
                setTargetIdentifier(e.target.value);
                setSelectedMatch(null);
              }}
              placeholder="Type @username or a profile name"
            />
            {searching ? (
              <p className="text-xs text-muted-foreground">{t('chat.newChat.searching')}</p>
            ) : null}
            {!searching && normalizedQuery.length >= 2 && matches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching users found.</p>
            ) : null}
            {!searching && matches.length > 0 ? (
              <div className="max-h-56 overflow-auto rounded-md border">
                {matches.map((item) => (
                  <button
                    key={item.uid}
                    type="button"
                    className={`w-full px-3 py-2 text-left hover:bg-muted ${selectedMatch?.uid === item.uid ? 'bg-muted' : ''}`}
                    onClick={() => {
                      setSelectedMatch(item);
                      setTargetIdentifier(item.username ? `@${item.username}` : item.name);
                    }}
                  >
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.username ? `@${item.username}` : getProfileIdentifier({ id: item.uid, name: item.name })}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Choose a real user from the list, or type an exact `@username`.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('chat.newChat.cancel')}
            </Button>
            <Button onClick={startChat} disabled={!normalizedQuery || searching}>
              {t('chat.newChat.start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NewChatButton;
