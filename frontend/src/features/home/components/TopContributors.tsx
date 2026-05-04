'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users } from 'lucide-react';
import type { Contributor } from '@/types';

type TopContributorsProps = {
  contributors?: Contributor[];
  initialContributors?: Contributor[];
  isLoading?: boolean;
};

export function TopContributors({ contributors = [], initialContributors = [], isLoading }: TopContributorsProps) {
  const { t } = useTranslation();
  const displayContributors = initialContributors.length > 0 ? initialContributors : contributors;

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!displayContributors || displayContributors.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-gradient-to-b from-transparent via-accent/5 to-transparent rounded-xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
        {displayContributors.map((contributor) => (
          <Card key={contributor.id} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              {contributor.profileImage && (
                <img
                  src={contributor.profileImage}
                  alt={contributor.name}
                  className="h-16 w-16 rounded-full mx-auto mb-3 object-cover"
                />
              )}
              {!contributor.profileImage && (
                <div className="h-16 w-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              )}
              <h3 className="font-semibold text-sm line-clamp-2">{contributor.displayName || contributor.name}</h3>
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-accent">
                <Heart className="h-3 w-3" />
                <span className="font-bold">{contributor.contributionCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {contributor.totalTokensContributed.toLocaleString()} tokens
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button size="lg" variant="outline" asChild className="gap-2">
          <Link href="/contributors">
            <Users className="h-4 w-4" />
            {t('home.contributors.viewAll', 'See All Contributors')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
