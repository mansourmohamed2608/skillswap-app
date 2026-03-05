"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

type Props = {
  triggerLabel?: string;
  initialDate?: Date;
  onOpenGuard?: () => boolean; // return false to prevent open (e.g., redirect)
  onConfirm: (newDate: Date) => Promise<void> | void;
};

export function RescheduleDialog({ triggerLabel, initialDate, onOpenGuard, onConfirm }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>("");
  const resolvedTrigger = triggerLabel ?? t('bookings.reschedule');

  useEffect(() => {
    if (initialDate) {
      // convert to local datetime-local input format (YYYY-MM-DDTHH:mm)
      const pad = (n: number) => String(n).padStart(2, "0");
      const d = new Date(initialDate);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      const s = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(s);
    }
  }, [initialDate]);

  const handleOpenChange = (next: boolean) => {
    if (next && onOpenGuard && onOpenGuard() === false) {
      return; // blocked by guard
    }
    setOpen(next);
  };

  const handleConfirm = async () => {
    try {
      const date = value ? new Date(value) : new Date();
      await onConfirm(date);
      setOpen(false);
    } catch (e) {
      // The caller handles toasts and routing; keep this silent
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{resolvedTrigger}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bookings.rescheduleTitle')}</DialogTitle>
          <DialogDescription>{t('bookings.rescheduleDescription', { defaultValue: 'Pick a new time to schedule this exchange.' })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{t('bookings.proposedTimeLabel')}</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm}>{t('common.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
