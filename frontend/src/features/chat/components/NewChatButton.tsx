"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlusIcon } from "lucide-react";
import React, { useState } from "react";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

export function NewChatButton() {
  const { active, canSendMessage, loading } = useMembership();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");

  function onClick() {
    if (loading) return;
    if (!active || !canSendMessage) {
      router.push('/pricing?alert=sub-required');
      return;
    }
    setOpen(true);
  }

  function startChat() {
    const nextId = targetUserId.trim();
    if (!nextId) {
      toast({ title: t('chat.newChat.missing'), variant: 'destructive' });
      return;
    }
    setOpen(false);
    setTargetUserId("");
    router.push(`/chat/${encodeURIComponent(nextId)}`);
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
              {t('chat.newChat.userIdLabel')}
            </label>
            <Input
              id="chat-user-id"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder={t('chat.newChat.userIdPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('chat.newChat.cancel')}
            </Button>
            <Button onClick={startChat}>
              {t('chat.newChat.start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NewChatButton;
