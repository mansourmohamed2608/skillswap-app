'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CommunityGuidelinesPage() {
  const { t } = useTranslation();
  const doc = t('legal.community', { returnObjects: true }) as any;
  const sections = [
    doc?.sections?.respect,
    doc?.sections?.safety,
    doc?.sections?.honesty,
    doc?.sections?.reporting,
    doc?.sections?.enforcement,
  ].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <header className="mb-8 text-center">
        <Users className="mx-auto h-12 w-12 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">{doc.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {doc.updated}
        </p>
      </header>

      <Card className="shadow-lg">
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 space-y-4">
          <p>{doc.intro}</p>
          {sections.map((section: any) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-primary">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
