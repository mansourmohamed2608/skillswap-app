"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RequestExchangeButton } from "@/features/listings/components/RequestExchangeButton";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { deleteListing } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MessageListingButton } from "@/features/listings/components/MessageListingButton";

type Props = {
  listingId: string;
  ownerId?: string | null;
  ownerName?: string | null;
};

export function ListingActions({ listingId, ownerId, ownerName }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = user?.uid && ownerId && user.uid === ownerId;
  const safeOwnerName = ownerName || t('listings.actions.ownerFallback');
  const router = useRouter();

  async function handleDeleteListing() {
    try {
      setDeleting(true);
      await deleteListing(listingId);
      toast({ title: t('listings.actions.deleteSuccess', { defaultValue: 'Listing deleted.' }) });
      setDeleteOpen(false);
      router.push('/profile?tab=active-listings');
    } catch {
      toast({ title: t('listings.actions.deleteFailed', { defaultValue: 'Could not delete listing.' }), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }

  if (isOwner) {
    return (
      <>
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
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            <Trash2Icon className="mr-2 h-5 w-5" />
            {t('listings.actions.delete', { defaultValue: 'Delete listing' })}
          </Button>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('listings.actions.delete', { defaultValue: 'Delete listing' })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('listings.actions.deleteConfirm', { defaultValue: 'Delete this listing?' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('reports.cancel', { defaultValue: 'Cancel' })}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteListing} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting
                  ? t('listings.actions.deleting', { defaultValue: 'Deleting...' })
                  : t('listings.actions.delete', { defaultValue: 'Delete listing' })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {ownerId && (
        <MessageListingButton listingId={listingId} ownerId={ownerId} ownerName={safeOwnerName} />
      )}
      <RequestExchangeButton listingId={listingId} />
    </div>
  );
}
