
'use client';

// src/app/legal/terms/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollTextIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TermsAndConditionsPage() {
  const { t } = useTranslation();
  const terms = t('legal.terms', { returnObjects: true }) as any;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <header className="mb-8 text-center">
        <ScrollTextIcon className="mx-auto h-12 w-12 text-primary mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-primary">{terms.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {terms.updated}
        </p>
      </header>

      <Card className="shadow-lg">
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 space-y-4">
          <p>{terms.intro1}</p>

          <p>{terms.intro2}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.definitions.title}</h2>
          <p>{terms.sections.definitions.body}</p>
          
          <h2 className="text-xl font-semibold text-primary">{terms.sections.cookies.title}</h2>
          <p>{terms.sections.cookies.body1}</p>
          <p>{terms.sections.cookies.body2}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.license.title}</h2>
          <p>{terms.sections.license.body1}</p>
          <p>{terms.sections.license.listIntro}</p>
          <ul className="list-disc pl-6">
            {terms.sections.license.list.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{terms.sections.license.body2}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.comments.title}</h2>
          <p>{terms.sections.comments.body}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.hyperlinking.title}</h2>
          <p>{terms.sections.hyperlinking.body}</p>
          
          <h2 className="text-xl font-semibold text-primary">{terms.sections.iframes.title}</h2>
          <p>{terms.sections.iframes.body}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.liability.title}</h2>
          <p>{terms.sections.liability.body}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.rights.title}</h2>
          <p>{terms.sections.rights.body}</p>

          <h2 className="text-xl font-semibold text-primary">{terms.sections.disclaimer.title}</h2>
          <p>{terms.sections.disclaimer.body1}</p>
          <ul className="list-disc pl-6">
            {terms.sections.disclaimer.list.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{terms.sections.disclaimer.body2}</p>
          <p>{terms.sections.disclaimer.body3}</p>
          
          <p className="mt-6 font-semibold">{terms.footerNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
