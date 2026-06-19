"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  ListIcon,
  SparklesIcon,
  LogInIcon,
  UserPlusIcon,
  LogOutIcon,
  CalendarDays,
  MessageCircle,
  UserIcon,
  GemIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { serviceCategories } from "@/services/serviceCategories";
import { useState } from "react";
import { cn } from "@/lib/utils";

type MobileMenuProps = {
  isAuthenticated: boolean;
  onSignOut: () => void;
};

const publicNavItems = [
  { href: "/", key: "home", icon: HomeIcon },
  { href: "/listings", key: "listings", icon: ListIcon },
  { href: "/matchmaking", key: "matchmaking", icon: SparklesIcon },
  { href: "/pricing", key: "pricing", icon: GemIcon },
];

const privateNavItems = [
  { href: "/bookings", key: "bookings", icon: CalendarDays },
  { href: "/chat", key: "chat", icon: MessageCircle },
  { href: "/profile", key: "profile", icon: UserIcon },
];

export function MobileMenu({ isAuthenticated, onSignOut }: MobileMenuProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const isRtl = i18n.language?.startsWith("ar");
  const sheetSide = isRtl ? "left" : "right";

  const labelFor = (key: string) => t(`header.${key}`);

  const navLinkClass =
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground transition-colors hover:bg-[#c8d5b9]/30";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 lg:hidden"
          aria-label={t("header.menu")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side={sheetSide} className="w-[min(100vw-2rem,20rem)] overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="text-[#3f7752]">{t("common.appName")}</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass}
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-5 w-5 shrink-0 text-[#739b7a]" />
              {labelFor(item.key)}
            </Link>
          ))}

          <div>
            <button
              type="button"
              className={cn(navLinkClass, "justify-between")}
              onClick={() => setCategoriesOpen((v) => !v)}
              aria-expanded={categoriesOpen}
            >
              <span className="flex items-center gap-3">
                <ListIcon className="h-5 w-5 shrink-0 text-[#739b7a]" />
                {t("header.categories")}
              </span>
              <ChevronDownIcon
                className={cn("h-4 w-4 transition-transform", categoriesOpen && "rotate-180")}
              />
            </button>
            {categoriesOpen ? (
              <div className="ms-4 mt-1 flex flex-col gap-0.5 border-s border-[#c8d5b9] ps-3">
                <Link
                  href="/listings"
                  className="min-h-10 rounded-lg px-2 py-2 text-sm hover:bg-[#c8d5b9]/30"
                  onClick={() => setOpen(false)}
                >
                  {t("services.allCategories")}
                </Link>
                {serviceCategories.slice(0, 8).map((category) => (
                  <Link
                    key={category}
                    href={`/listings?category=${encodeURIComponent(category)}`}
                    className="min-h-10 rounded-lg px-2 py-2 text-sm hover:bg-[#c8d5b9]/30"
                    onClick={() => setOpen(false)}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {isAuthenticated
            ? privateNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0 text-[#739b7a]" />
                  {labelFor(item.key)}
                </Link>
              ))
            : null}

          <div className="my-3 h-px bg-[#c8d5b9]" />

          <div className="px-3 py-2">
            <LanguageSwitcher showLabel className="w-full justify-center" />
          </div>

          {isAuthenticated ? (
            <Button
              variant="ghost"
              onClick={() => {
                onSignOut();
                setOpen(false);
              }}
              className="min-h-11 w-full justify-start gap-3 rounded-xl px-3 text-base"
            >
              <LogOutIcon className="h-5 w-5" />
              {t("header.signOut")}
            </Button>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                <LogInIcon className="h-5 w-5 shrink-0 text-[#739b7a]" />
                {t("header.signIn")}
              </Link>
              <Link href="/auth/signup" onClick={() => setOpen(false)} className="px-3 pt-2">
                <Button className="h-11 w-full rounded-xl bg-[#d4642f] hover:bg-[#be5527]">
                  <UserPlusIcon className="me-2 h-4 w-4" />
                  {t("header.signUp")}
                </Button>
              </Link>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
