'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageListingButton } from '@/features/listings/components/MessageListingButton';
import { getListingCoverImage } from '@/lib/listingImages';
import { getPublicLocationLabel } from '@/lib/location';
import { getListingPath } from '@/lib/public-ids';
import { getProfilePath } from '@/lib/profile';
import { getServiceCategoryLabel } from '@/services/serviceCategories';
import type { ServiceListing, User } from '@/types';

type Props = { listing: ServiceListing; user: User | null };

/** The compact, exchange-first card specified for the R&O home-page redesign. */
export function FeaturedListingCard({ listing, user }: Props) {
  const { t, i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');
  const offeredCategory = getServiceCategoryLabel(listing.offeredService?.category, t);
  const requestedCategory = getServiceCategoryLabel(listing.requestedService?.category, t);
  const ownerName = user?.name || t('listings.actions.ownerFallback', { defaultValue: 'Member' });
  const location = getPublicLocationLabel(user?.location || listing.location, t('listings.card.locationApprox'));
  const coverSrc = listing.offeredService?.imageUrl || getListingCoverImage(listing.offeredService?.category);
  const requestText = listing.requestedKind === 'money' && listing.requestedMoney
    ? `${listing.requestedMoney.amount} ${listing.requestedMoney.currency}`
    : listing.requestedKind === 'product'
      ? listing.requestedProduct?.name || t('listings.card.productRequested', { defaultValue: 'Product requested' })
      : listing.requestedService?.title || t('listings.card.openToOffers', { defaultValue: 'Open to offers' });
  const requestCategory = listing.requestedKind === 'money'
    ? t('listings.card.paymentRequested', { defaultValue: 'Payment requested' })
    : listing.requestedKind === 'product'
      ? t('listings.card.productRequested', { defaultValue: 'Product requested' })
      : requestedCategory;
  const requestDescription = listing.requestedKind === 'product'
    ? listing.requestedProduct?.description
    : listing.requestedService?.description;
  const offerText = listing.offeredService?.title || t('listings.card.untitled', { defaultValue: 'Untitled listing' });
  const ownerProfile = user || { id: listing.offeredByUserId, name: ownerName };
  const ownerProfileHref = `${getProfilePath(ownerProfile)}?uid=${encodeURIComponent(listing.offeredByUserId)}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#c8e4d5] bg-white shadow-[0_10px_28px_rgb(14_43_40/0.07)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgb(14_43_40/0.12)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#f5fbf7]">
        <Image
          src={coverSrc}
          alt={listing.offeredService?.imageUrl ? offerText : `${offeredCategory} category illustration`}
          fill
          className="object-cover"
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 48vw, 390px"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-2.5 text-xs">
          <section className="rounded-xl border border-[#dce9ba] bg-[#f4f9df] p-3">
            <p className="font-bold uppercase tracking-[0.08em] text-[#55703d]">{t('home.featured.request', { defaultValue: 'Request' })}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-black leading-snug tracking-[-0.02em] text-[var(--ro-deep-teal)]">{requestText}</h3>
            <p className="mt-1 truncate text-[10px] font-semibold text-[#55703d]">{requestCategory}</p>
            {requestDescription ? <p className="mt-1 line-clamp-2 leading-5 text-muted-foreground">{requestDescription}</p> : null}
          </section>
          <section className="rounded-xl border border-[#c8e4d5] bg-[#e8f6ee] p-3">
            <p className="font-bold uppercase tracking-[0.08em] text-[#27735e]">{t('home.featured.offer', { defaultValue: 'Offer' })}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-black leading-snug tracking-[-0.02em] text-[var(--ro-deep-teal)]">{offerText}</h3>
            <p className="mt-1 truncate text-[10px] font-semibold text-[#27735e]">{offeredCategory}</p>
            {listing.offeredService?.description ? <p className="mt-1 line-clamp-2 leading-5 text-muted-foreground">{listing.offeredService.description}</p> : null}
          </section>
        </div>

        <Link href={ownerProfileHref} className="mt-4 flex items-center gap-2 rounded-lg border-t border-[#d9ebdf] pt-3 transition-colors hover:bg-[#f5fbf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ro-orange)]">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={user?.avatarUrl} alt="" />
            <AvatarFallback className="bg-[#e8f6ee] text-xs text-[#27735e]">{ownerName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[var(--ro-deep-teal)]">{ownerName}</p>
            {location ? <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground"><MapPinIcon className="size-3 shrink-0" />{location}</p> : null}
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <MessageListingButton
          listingId={listing.id}
          ownerId={listing.offeredByUserId}
          ownerName={ownerName}
          compact
          className="bg-[#278a78] text-white hover:bg-[#1d735f]"
        />
        <Button asChild size="sm" variant="outline" className="h-10 rounded-xl border-[#b9decc] bg-white text-xs text-[var(--ro-deep-teal)] hover:bg-[#f3f9f6]">
          <Link href={getListingPath(listing)}>
            {t('listings.card.viewDetails', { defaultValue: 'View details' })}<ArrowRightIcon className={`ms-1 size-3.5 ${arabic ? 'rotate-180' : ''}`} />
          </Link>
        </Button>
      </div>
    </article>
  );
}
