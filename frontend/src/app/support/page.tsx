'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SupportPage() {
  const { t } = useTranslation();
  const doc = t('support', { returnObjects: true }) as any;
  const sections = [
    doc?.sections?.contact,
    doc?.sections?.billing,
    doc?.sections?.kyc,
    doc?.sections?.safety,
  ].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <header className="mb-8 text-center">
        <LifeBuoy className="mx-auto h-12 w-12 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">{doc.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{doc.subtitle}</p>
      </header>

      <Card className="shadow-lg">
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 space-y-4">
          {sections.map((section: any) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-primary">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href="/chat">{doc.chatCta}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
