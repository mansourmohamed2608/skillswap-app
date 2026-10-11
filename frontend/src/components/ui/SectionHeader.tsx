'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  centered?: boolean;
};

export function SectionHeader({ id, title, subtitle, action, className, centered }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex items-end justify-between gap-3',
        centered && 'flex-col items-center text-center',
        className
      )}
    >
      <div className={cn(centered && 'max-w-xl')}>
        {id ? (
          <h2 id={id} className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">
            {title}
          </h2>
        ) : (
          <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">{title}</h2>
        )}
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
