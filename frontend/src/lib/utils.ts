import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function appLocale(lang?: string) {
  const l = (lang || (typeof navigator !== 'undefined' ? navigator.language : 'en')) || 'en';
  return l.startsWith('ar') ? 'ar-EG' : 'en-US';
}

export function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions, lang?: string) {
  try {
    return new Intl.DateTimeFormat(appLocale(lang), opts).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function formatTime(d: Date, opts?: Intl.DateTimeFormatOptions, lang?: string) {
  const o = opts || { hour: '2-digit', minute: '2-digit' } as const;
  return formatDate(d, o as any, lang);
}

export function formatNumber(n: number, lang?: string) {
  try {
    return new Intl.NumberFormat(appLocale(lang)).format(n);
  } catch {
    return String(n);
  }
}
