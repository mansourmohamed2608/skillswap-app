// src/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageController } from '@/components/i18n/LanguageController';
import { AppHeader } from '@/components/layout/AppHeader';
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}>
        {/* Client-side controller keeps <html> lang/dir in sync with i18n */}
        <LanguageController />
        <AuthProvider>
          <KycGate>
            <AppHeader />
            <main className="flex-grow container mx-auto px-4 py-8 max-w-screen-2xl">
              {children}
            </main>
            <Toaster />
            <AppFooter />
          </KycGate>
        </AuthProvider>
      </body>
    </html>
  );
}
