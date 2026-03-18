"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const rawSrc = typeof src === "string" ? src.trim() : ""
  let shouldUseFallback = !rawSrc

  if (!shouldUseFallback) {
    try {
      const parsed = new URL(rawSrc, "https://skillswap.local")
      const host = parsed.hostname.toLowerCase()
      const path = parsed.pathname.toLowerCase()
      const isPlaceholderHost = host === "placehold.co" || host === "via.placeholder.com"
      const isPlaceholderPath = /\/\d+x\d+/.test(path)
      if (isPlaceholderHost || isPlaceholderPath) shouldUseFallback = true
    } catch {
      // Ignore URL parsing issues and keep the source as-is.
    }
  }

  const resolvedSrc = shouldUseFallback ? "/images/default-avatar.svg" : rawSrc

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={resolvedSrc}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
