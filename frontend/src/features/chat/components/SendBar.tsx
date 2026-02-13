"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaperclipIcon, SmileIcon, SendIcon } from "lucide-react";
import React, { useState } from "react";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { sendChatMessage } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";

type SendBarProps = {
  recipientId?: string;
  disabled?: boolean;
  onSent?: () => void;
};

export function SendBar({ recipientId, disabled, onSent }: SendBarProps) {
  const { active, canSendMessage, loading } = useMembership();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [text, setText] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (!user?.uid) {
      router.push('/auth/signin');
      return;
    }
    if (!recipientId) {
      toast({ title: t('chat.detail.sendFailed'), variant: 'destructive' });
      return;
    }
    if (!active || !canSendMessage) {
      router.push('/pricing?alert=sub-required');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await sendChatMessage({ recipientId, text: trimmed });
      setText("");
      onSent?.();
    } catch (err: any) {
      toast({
        title: t('chat.detail.sendFailed'),
        description: getErrorMessage(err, t('chat.detail.sendFailed')),
        variant: 'destructive',
      });
    }
  }

  return (
    <form className="flex w-full items-center space-x-2" onSubmit={onSubmit}>
      <Button variant="ghost" size="icon" type="button">
        <PaperclipIcon className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">{t('chat.sendBar.attach')}</span>
      </Button>
      <Input
        type="text"
        placeholder={t('chat.sendBar.placeholder')}
        className="flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <Button variant="ghost" size="icon" type="button">
        <SmileIcon className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">{t('chat.sendBar.emoji')}</span>
      </Button>
      <Button type="submit" size="icon" className="bg-accent hover:bg-accent/90" disabled={disabled || !text.trim()}>
        <SendIcon className="h-5 w-5 text-accent-foreground" />
        <span className="sr-only">{t('chat.sendBar.send')}</span>
      </Button>
    </form>
  );
}

export default SendBar;
