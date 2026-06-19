import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthCard({ title, description, icon, children, footer, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        "mx-auto w-full max-w-md rounded-2xl border-[#c8d5b9] bg-[#fffdf0] p-0 shadow-md",
        className
      )}
    >
      <CardHeader className="space-y-2 px-6 pb-2 pt-6 text-center md:px-8 md:pt-8">
        {icon ? <div className="mx-auto">{icon}</div> : null}
        <CardTitle className="text-2xl font-bold text-[#3f7752]">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-base">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 px-6 md:px-8">{children}</CardContent>
      {footer ? (
        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-2 md:px-8 md:pb-8">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
