'use client';

import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { getListingCoverSlug } from '@/lib/listingImages';

type ServiceVisualProps = {
  category?: string | null;
  className?: string;
  compact?: boolean;
};

export function ServiceVisual({ category, className, compact }: ServiceVisualProps) {
  const slug = getListingCoverSlug(category);
  const minH = compact ? 96 : 120;

  const visuals: Record<string, ReactElement> = {
    programming: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#eef5ef" rx="12" />
        <rect x="16" y="18" width="88" height="60" rx="8" fill="#fff" stroke="#3f7752" strokeWidth="1.5" />
        <rect x="24" y="26" width="36" height="4" rx="2" fill="#c8d5b9" />
        <rect x="24" y="36" width="52" height="3" rx="1.5" fill="#739b7a" opacity="0.5" />
        <text x="24" y="62" fontSize="9" fill="#3f7752" fontFamily="monospace">{'< />'}</text>
      </svg>
    ),
    design: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#faf6ef" rx="12" />
        <circle cx="36" cy="40" r="14" fill="#d4642f" opacity="0.85" />
        <circle cx="56" cy="32" r="14" fill="#3f7752" opacity="0.75" />
        <circle cx="76" cy="44" r="14" fill="#739b7a" opacity="0.7" />
        <path d="M24 68 Q60 52 96 68" stroke="#3f7752" strokeWidth="2" fill="none" />
      </svg>
    ),
    photography: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#eef0f5" rx="12" />
        <rect x="28" y="28" width="64" height="44" rx="8" fill="#2d4a38" />
        <circle cx="60" cy="50" r="14" fill="#739b7a" stroke="#fff" strokeWidth="2" />
        <circle cx="60" cy="50" r="6" fill="#fffdf0" />
      </svg>
    ),
    education: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#f5f3ea" rx="12" />
        <path d="M20 38 L60 22 L100 38 L60 54 Z" fill="#3f7752" opacity="0.85" />
        <rect x="34" y="48" width="52" height="28" rx="4" fill="#fff" stroke="#c8d5b9" />
      </svg>
    ),
    business: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#eef2f5" rx="12" />
        <rect x="28" y="52" width="12" height="24" rx="2" fill="#739b7a" />
        <rect x="46" y="40" width="12" height="36" rx="2" fill="#3f7752" />
        <rect x="64" y="32" width="12" height="44" rx="2" fill="#d4642f" opacity="0.8" />
      </svg>
    ),
    fitness: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#f0f5ee" rx="12" />
        <rect x="22" y="44" width="14" height="14" rx="3" fill="#3f7752" />
        <rect x="84" y="44" width="14" height="14" rx="3" fill="#3f7752" />
        <rect x="36" y="48" width="48" height="6" rx="3" fill="#739b7a" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#f5f0ea" rx="12" />
        <path d="M60 24 L92 48 V72 H28 V48 Z" fill="#fff" stroke="#3f7752" strokeWidth="1.5" />
        <rect x="48" y="56" width="24" height="16" rx="2" fill="#739b7a" opacity="0.5" />
      </svg>
    ),
    music: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#f3eef5" rx="12" />
        <ellipse cx="44" cy="68" rx="10" ry="8" fill="#3f7752" />
        <ellipse cx="72" cy="62" rx="10" ry="8" fill="#3f7752" />
        <rect x="50" y="28" width="3" height="42" fill="#739b7a" />
        <rect x="78" y="22" width="3" height="42" fill="#739b7a" />
      </svg>
    ),
    writing: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#faf8f0" rx="12" />
        <rect x="32" y="24" width="56" height="48" rx="6" fill="#fff" stroke="#c8d5b9" />
        <rect x="40" y="36" width="40" height="3" rx="1.5" fill="#739b7a" opacity="0.5" />
        <path d="M72 58 L88 42 L92 58 Z" fill="#d4642f" opacity="0.75" />
      </svg>
    ),
    tech: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#eef3f5" rx="12" />
        <rect x="36" y="28" width="48" height="36" rx="6" fill="#2d4a38" />
        <rect x="44" y="36" width="32" height="20" rx="2" fill="#739b7a" opacity="0.4" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 120 96" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="96" fill="#f7f6df" rx="12" />
        <circle cx="44" cy="40" r="16" fill="#3f7752" opacity="0.15" />
        <circle cx="76" cy="56" r="16" fill="#d4642f" opacity="0.15" />
        <path d="M52 48 H68 M60 40 V56" stroke="#3f7752" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ minHeight: minH }}>
      {visuals[slug] ?? visuals.default}
    </div>
  );
}
