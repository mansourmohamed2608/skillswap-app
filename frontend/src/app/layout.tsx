// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Cairo } from 'next/font/google';
import './globals.css';
import { LanguageController } from '@/components/i18n/LanguageController';
import { AppHeader } from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import FloatingChatButton from '@/components/layout/FloatingChatButton';
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
    { media: '(prefers-color-scheme: light)', color: '#f5f0e0' },
    { media: '(prefers-color-scheme: dark)',  color: '#1a1a1a' },
  ],
};

export const metadata: Metadata = {
  title: 'SkillSwap - Exchange Services',
  description: 'A platform to offer and request services in exchange for other services.',
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
            <AppHeader />
            <main className="flex-grow container mx-auto px-4 pb-24 sm:px-6 sm:pb-28 py-4 sm:py-6 md:py-8 md:pb-8 max-w-screen-2xl">
              {children}
            </main>
            <FloatingChatButton />
            <Toaster />
            <AppFooter />
          </KycGate>
        </AuthProvider>
      </body>
    </html>
  );
}
