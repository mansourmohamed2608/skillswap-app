import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[var(--ro-deep-teal)]', className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 shrink-0"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
        <path d="m18 2 4 4-4 4" />
        <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2l4.4 8.2c.7 1.3 2.1 2.2 3.6 2.2H22" />
        <path d="m18 22 4-4-4-4" />
      </svg>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-lg font-black tracking-[-0.055em]">
            R<span className="relative -top-[0.08em] mx-[0.015em] text-[0.64em] text-[var(--ro-orange)]">&amp;</span>O
          </span>
          <span className="mt-0.5 block text-[7px] font-bold tracking-[-0.01em]">Request &amp; Offer</span>
        </span>
      ) : null}
    </span>
  );
}
