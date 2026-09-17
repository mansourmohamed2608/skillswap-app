"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ApiError, createServiceRequest, fetchListingRequestState, recordAnalyticsEvent, type ListingRequestState } from "@/services/api";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDaysIcon, CheckCircle2Icon, Clock3Icon, Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  ownerId?: string;
  className?: string;
  compact?: boolean;
};

export function RequestExchangeButton({ listingId, ownerId, className, compact = false }: Props) {
  const { active, canCreateBooking, loading } = useMembership();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [requestState, setRequestState] = useState<ListingRequestState>({ state: 'none' });
  const [stateLoading, setStateLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!user?.uid) {
      setRequestState({ state: 'none' });
      return () => { mounted = false; };
    }
    setStateLoading(true);
    fetchListingRequestState(listingId)
      .then((result) => {
        if (mounted) setRequestState(result);
      })
      .catch(() => {
        if (mounted) setRequestState({ state: 'none' });
      })
      .finally(() => {
        if (mounted) setStateLoading(false);
      });
    return () => { mounted = false; };
  }, [listingId, user?.uid]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      if (!user) {
        router.push(`/auth/signin?next=${encodeURIComponent(`/listings/${listingId}`)}`);
        return;
      }
      if (loading || stateLoading) return;
      if (!active || !canCreateBooking) {
        router.push("/pricing?alert=sub-required");
        return;
      }
    }
    setOpen(next);
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const proposedTime = when ? new Date(when).toISOString() : undefined;
      const res = await createServiceRequest({ listingId, proposedTime, message });
      recordAnalyticsEvent('exchange_requested', { listingId });
      setRequestState({ state: 'pending', requestId: res.id, publicId: res.publicId });
      setOpen(false);
      toast({ title: t('request.requestSent'), description: t('listings.request.toastSent') });
    } catch (e: any) {
      if (e instanceof ApiError && (e.code === 'KYC_REQUIRED' || e.code === 'KYC_FAILED')) {
        router.push('/profile/verify');
      } else if (e instanceof ApiError && e.code === 'KYC_PENDING') {
        toast({ title: t('listings.request.toastFailed'), description: e.message, variant: 'destructive' });
      } else if (e instanceof ApiError && e.code === 'MEMBERSHIP_REQUIRED') {
        router.push("/pricing?alert=sub-required");
      } else if (e instanceof ApiError && e.code === 'DUPLICATE_REQUEST') {
        setRequestState({ state: 'pending' });
        setOpen(false);
        toast({
          title: t('listings.request.pending', { defaultValue: 'Request pending' }),
          description: getErrorMessage(e, t('listings.request.pending', { defaultValue: 'You already have an active request for this listing.' })),
        });
      } else {
        toast({ title: t('listings.request.toastFailed'), description: getErrorMessage(e, t('listings.request.toastFailed')), variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (requestState.state === 'owner' || (user?.uid && ownerId === user.uid)) return null;

  if (requestState.state === 'pending' || requestState.state === 'accepted') {
    const accepted = requestState.state === 'accepted';
    return (
      <Button
        type="button"
        size={compact ? 'sm' : 'lg'}
        variant="outline"
        className={cn(compact ? 'h-10 rounded-xl text-xs' : 'h-12 rounded-lg', className)}
        onClick={() => {
          if (requestState.publicId || requestState.requestId) {
            router.push(`/bookings/${encodeURIComponent(requestState.publicId || requestState.requestId || '')}`);
          }
        }}
        disabled={!requestState.publicId && !requestState.requestId}
      >
        {accepted ? <CheckCircle2Icon className="h-4 w-4" /> : <Clock3Icon className="h-4 w-4" />}
        {accepted
          ? t('listings.request.connected', { defaultValue: 'Connected' })
          : t('listings.request.pending', { defaultValue: 'Request pending' })}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size={compact ? 'sm' : 'lg'}
          variant="secondary"
          className={cn(compact ? 'h-10 rounded-xl text-xs' : 'h-12 rounded-lg sm:flex-1', 'w-full', className)}
          disabled={stateLoading}
        >
          {stateLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CalendarDaysIcon className="h-5 w-5 shrink-0" />}
          <span className="truncate font-semibold leading-none">
            {t('listings.request.connect', { defaultValue: 'Connect / Request Exchange' })}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('request.proposeTitle')}</DialogTitle>
          <DialogDescription>{t('request.proposeDescription', { defaultValue: 'Set a preferred time and optional message for the exchange.' })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">{t('request.when')}</label>
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('request.message')}</label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('listings.request.messagePlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? t('requests.sending', { defaultValue: 'Sending...' }) : t('request.sendRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
