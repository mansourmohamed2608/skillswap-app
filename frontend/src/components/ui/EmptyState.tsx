'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-[#c8d5b9] bg-[#fffdf0]/80 px-5 py-10 text-center',
        className
      )}
    >
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#3f7752]/10 text-[#3f7752]">
        {icon}
      </div>
      <p className="font-semibold text-[#2d4a38]">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Button asChild className="mt-5 h-11 rounded-xl bg-[#d4642f] hover:bg-[#d4642f]/90">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <Button type="button" onClick={onAction} className="mt-5 h-11 rounded-xl bg-[#d4642f] hover:bg-[#d4642f]/90">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#c8d5b9]/60 bg-white">
      <div className="skeleton-shimmer h-24 w-full" />
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-4 w-20 rounded-full" />
        <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
        <div className="skeleton-shimmer h-3 w-full rounded-md" />
        <div className="skeleton-shimmer mt-3 h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function WishCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#c8d5b9]/60 bg-white p-4">
      <div className="flex gap-3">
        <div className="skeleton-shimmer size-14 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
          <div className="skeleton-shimmer h-3 w-full rounded-md" />
        </div>
      </div>
      <div className="skeleton-shimmer mt-4 h-10 w-full rounded-xl" />
    </div>
  );
}
