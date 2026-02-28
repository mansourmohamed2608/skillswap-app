"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { RequestExchangeButton } from "@/features/listings/components/RequestExchangeButton";
import { useMembership } from "@/hooks/useMembership";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { getUserById } from "@/services/data";
import { getProfileIdentifier } from "@/lib/profile";
import { deleteListing } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

type Props = {
  listingId: string;
  ownerId?: string | null;
  ownerName?: string | null;
};

export function ListingActions({ listingId, ownerId, ownerName }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const isOwner = user?.uid && ownerId && user.uid === ownerId;
  const safeOwnerName = ownerName || t('listings.actions.ownerFallback');
   const { active, canCreateBooking, loading } = useMembership();
   const router = useRouter();

  if (isOwner) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild className="flex-1" variant="secondary">
          <Link href={`/listings/${listingId}/edit`}>
            <PencilIcon className="mr-2 h-5 w-5" />
            {t('listings.actions.edit')}
          </Link>
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={async () => {
            const ok = typeof window !== 'undefined'
              ? window.confirm(t('listings.actions.deleteConfirm', { defaultValue: 'Delete this listing?' }))
              : true;
            if (!ok) return;
            try {
              await deleteListing(listingId);
              toast({ title: t('listings.actions.deleteSuccess', { defaultValue: 'Listing deleted.' }) });
              router.push('/profile?tab=active-listings');
            } catch (err: any) {
              toast({ title: t('listings.actions.deleteFailed', { defaultValue: 'Could not delete listing.' }), variant: 'destructive' });
            }
          }}
        >
          <Trash2Icon className="mr-2 h-5 w-5" />
          {t('listings.actions.delete', { defaultValue: 'Delete listing' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-8">
      {ownerId && (
        <Button
          size="lg"
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={async (e) => {
            e.preventDefault();
            if (loading) return;
            if (!user || !active || !canCreateBooking) {
              router.push("/pricing?alert=sub-required");
              return;
            }
            let chatTarget = String(ownerId || '').trim();
            try {
              const owner = ownerId ? await getUserById(ownerId) : null;
              if (owner) {
                chatTarget = getProfileIdentifier(owner);
              }
            } catch {}
            router.push(`/chat/${encodeURIComponent(chatTarget)}?name=${encodeURIComponent(safeOwnerName)}`);
          }}
        >
          <MessageCircleIcon className="mr-2 h-5 w-5" />
          {t('listings.actions.chatWith', { name: safeOwnerName })}
        </Button>
      )}
      <RequestExchangeButton listingId={listingId} />
    </div>
  );
}
