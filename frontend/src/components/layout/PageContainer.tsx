import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section" | "main";
  narrow?: boolean;
};

export function PageContainer({
  className,
  as: Tag = "div",
  narrow = false,
  ...props
}: PageContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-md" : "max-w-6xl",
        className
      )}
      {...props}
    />
  );
}
