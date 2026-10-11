// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Cairo } from 'next/font/google';
import './globals.css';
import { LanguageController } from '@/components/i18n/LanguageController';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import AppFooter from '@/components/layout/AppFooter';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { KycGate } from '@/components/auth/KycGate';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Arabic script font - used when lang="ar" is active
const cairofont = Cairo({
  variable: '--font-cairo',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#0e2b28' },
  ],
};

export const metadata: Metadata = {
  title: 'R&O - Request and Offer',
  description: 'Request what you need. Offer what you know.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLang = process.env.NEXT_PUBLIC_DEFAULT_LANG === 'ar' ? 'ar' : 'en';
  const dir = initialLang === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={initialLang} dir={dir} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${cairofont.variable} font-sans antialiased flex flex-col min-h-screen`}>
        {/* Client-side controller keeps <html> lang/dir in sync with i18n */}
        <LanguageController />
        <AuthProvider>
          <KycGate>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow-md"
            >
              Skip to content
            </a>
            <AppHeader />
            <main id="main-content" className="relative mx-auto w-full max-w-[1440px] flex-grow px-4 pb-nav-mobile pt-4 sm:px-6 sm:pt-6 lg:px-8">
              {children}
            </main>
            <MobileBottomNav />
            <Toaster />
            <AppFooter />
          </KycGate>
        </AuthProvider>
      </body>
    </html>
  );
}
