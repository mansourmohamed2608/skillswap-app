import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-xl border border-[#d8d8b8] bg-[#f7f6df] px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:border-[#3f7752] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f7752]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
