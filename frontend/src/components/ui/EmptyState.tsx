import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[#c8d5b9] bg-[#fffdf0] px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="mx-auto mb-4 flex justify-center text-[#739b7a]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[#3f7752] sm:text-xl">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
