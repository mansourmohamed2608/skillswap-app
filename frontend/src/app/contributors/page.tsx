'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Trophy, TrendingUp, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Contributor {
  id: string;
  name: string;
  displayName: string;
  profileImage?: string;
  totalTokensContributed: number;
  contributionCount: number;
  wishTitle: string;
  amount: number;
  createdAt: string;
}

export default function ContributorsPage() {
  const { t } = useTranslation();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'tokens' | 'count' | 'recent'>('tokens');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContributors();
  }, []);

  const fetchContributors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/wallet/top-contributors?limit=100');
      if (response.ok) {
        const data = await response.json();
        setContributors(data);
      }
    } catch (error) {
      console.error('Failed to fetch contributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContributors = contributors
    .filter((c) =>
      c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.wishTitle.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'tokens') return b.totalTokensContributed - a.totalTokensContributed;
      if (sortBy === 'count') return b.contributionCount - a.contributionCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const topContributor = contributors[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('contributors.title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('contributors.description')}
          </p>
        </div>

        {/* Top Contributor Spotlight */}
        {topContributor && (
          <Card className="mb-12 p-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <Trophy className="absolute -top-4 -right-4 w-8 h-8 text-yellow-500" />
                <Avatar className="w-24 h-24">
                  <AvatarImage src={topContributor.profileImage} alt={topContributor.displayName} />
                  <AvatarFallback>{topContributor.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-600">{t('contributors.top_contributor')}</span>
                </div>
                <h2 className="text-3xl font-bold mb-2">{topContributor.displayName}</h2>
                <p className="text-muted-foreground mb-4">
                  {t('contributors.supporting_wish', { wish: topContributor.wishTitle })}
                </p>
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {topContributor.totalTokensContributed.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('contributors.tokens_contributed')}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {topContributor.contributionCount}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('contributors.contributions')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="tokens" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('contributors.sort_tokens')}
              </TabsTrigger>
              <TabsTrigger value="count">{t('contributors.sort_count')}</TabsTrigger>
              <TabsTrigger value="recent">{t('contributors.sort_recent')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contributors List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-20 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : filteredContributors.length > 0 ? (
          <div className="space-y-4">
            {filteredContributors.map((contributor, index) => (
              <Card
                key={contributor.id}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar>
                    <AvatarImage src={contributor.profileImage} alt={contributor.displayName} />
                    <AvatarFallback>{contributor.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{contributor.displayName}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {t('contributors.supporting_wish', { wish: contributor.wishTitle })}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xl font-bold text-primary">
                      {contributor.totalTokensContributed.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {contributor.contributionCount} {t('contributors.contributions')}
                    </p>
                  </div>

                  {/* View Profile */}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-shrink-0"
                  >
                    <Link href={`/profile/${contributor.id}`}>
                      {t('common.view_profile')}
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">{t('contributors.no_contributors')}</p>
            <Button asChild>
              <Link href="/">{t('common.back_to_home')}</Link>
            </Button>
          </Card>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          <Card className="p-6 text-center">
            <p className="text-3xl font-bold text-primary mb-2">
              {contributors.length}
            </p>
            <p className="text-muted-foreground">{t('contributors.total_contributors')}</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-3xl font-bold text-primary mb-2">
              {contributors.reduce((sum, c) => sum + c.totalTokensContributed, 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground">{t('contributors.total_tokens')}</p>
          </Card>
          <Card className="p-6 text-center">
            <p className="text-3xl font-bold text-primary mb-2">
              {contributors.reduce((sum, c) => sum + c.contributionCount, 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground">{t('contributors.total_contributions')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
