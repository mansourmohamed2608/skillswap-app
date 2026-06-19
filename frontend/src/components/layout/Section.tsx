import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SectionProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div";
  tight?: boolean;
};

export function Section({
  className,
  as: Tag = "section",
  tight = false,
  ...props
}: SectionProps) {
  return (
    <Tag
      className={cn(
        tight ? "py-6 md:py-8" : "py-8 md:py-12 lg:py-16",
        className
      )}
      {...props}
    />
  );
}
