"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createServiceRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";

export function RequestExchangeButton({ listingId }: { listingId: string }) {
  const { active, canCreateBooking, loading } = useMembership();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      if (loading) return; // wait until ready
      if (!active || !canCreateBooking) {
        router.push("/pricing?alert=sub-required");
        return;
      }
    }
    setOpen(next);
  };

  const handleConfirm = async () => {
    try {
      const proposedTime = when ? new Date(when).toISOString() : undefined;
      const res = await createServiceRequest({ listingId, proposedTime, message });
      setOpen(false);
      toast({ title: t('request.requestSent'), description: t('listings.request.toastId', { id: res.id }) });
    } catch (e: any) {
      if (e?.status === 403) {
        router.push("/pricing?alert=sub-required");
      } else {
        toast({ title: t('listings.request.toastFailed'), description: getErrorMessage(e, t('listings.request.toastFailed')), variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="flex-1">
          {t('request.proposeTitle')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('request.proposeTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">{t('request.when')}</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border px-3 py-2"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('request.message')}</label>
            <textarea
              className="w-full rounded-md border px-3 py-2"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('listings.request.messagePlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm}>{t('request.sendRequest')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
