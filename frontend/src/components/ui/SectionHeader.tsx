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
        'mb-4 flex items-end justify-between gap-3',
        centered && 'flex-col items-center text-center',
        className
      )}
    >
      <div className={cn(centered && 'max-w-xl')}>
        {id ? (
          <h2 id={id} className="text-xl font-bold text-[#3f7752] sm:text-2xl">
            {title}
          </h2>
        ) : (
          <h2 className="text-xl font-bold text-[#3f7752] sm:text-2xl">{title}</h2>
        )}
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
