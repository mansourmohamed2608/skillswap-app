'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon, MapPin, Heart } from 'lucide-react';
import { ServiceCard } from '@/features/listings/components/ServiceCard';

function UserResultCard({ user }: { user: any }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
          {(user.displayName || user.name || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{user.displayName || user.name || user.email || 'User'}</h3>
          <p className="text-sm text-muted-foreground truncate">{user.bio || user.country || user.city || ''}</p>
        </div>
      </div>
    </Card>
  );
}

interface SearchResult {
  listings: any[];
  wishes: any[];
  services: any[];
  categories: any[];
  locations: any[];
  users: any[];
}

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResult>({
    listings: [],
    wishes: [],
    services: [],
    categories: [],
    locations: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, i18n.language]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const resultCount = 
    results.listings.length + 
    results.wishes.length + 
    results.services.length + 
    results.users.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search.placeholder') || 'Search listings, wishes, services...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? t('common.searching') : t('common.search')}
            </Button>
          </div>
        </form>

        {/* Results Header */}
        {query && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {t('search.results_for')} &quot;{query}&quot;
            </h1>
            <p className="text-muted-foreground">
              {loading ? (
                t('common.loading')
              ) : resultCount > 0 ? (
                t('search.found_results', { count: resultCount })
              ) : (
                t('search.no_results')
              )}
            </p>
          </div>
        )}

        {/* Tabs */}
        {!loading && resultCount > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="listings" className="relative">
                {t('search.listings')}
                <span className="ml-2 text-xs bg-accent text-accent-foreground rounded-full px-2 py-1">
                  {results.listings.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="wishes" className="relative">
                {t('search.wishes')}
                <span className="ml-2 text-xs bg-accent text-accent-foreground rounded-full px-2 py-1">
                  {results.wishes.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="services" className="relative">
                {t('search.services')}
                <span className="ml-2 text-xs bg-accent text-accent-foreground rounded-full px-2 py-1">
                  {results.services.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="users" className="relative">
                {t('search.users')}
                <span className="ml-2 text-xs bg-accent text-accent-foreground rounded-full px-2 py-1">
                  {results.users.length}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Listings Results */}
            <TabsContent value="listings" className="space-y-4">
              {results.listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.listings.map((listing) => (
                    <ServiceCard key={listing.id} listing={listing} user={null} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t('search.no_listings')}</p>
                </Card>
              )}
            </TabsContent>

            {/* Wishes Results */}
            <TabsContent value="wishes" className="space-y-4">
              {results.wishes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.wishes.map((wish) => (
                    <Card key={wish.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="flex items-start gap-4">
                        {wish.imageUrl && (
                          <img
                            src={wish.imageUrl}
                            alt={wish.title}
                            className="w-20 h-20 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{wish.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {wish.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {wish.totalDonated} / {wish.goalAmount} {wish.currency}
                            </span>
                            <Button size="sm" variant="outline">
                              {t('wishes.contribute')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t('search.no_wishes')}</p>
                </Card>
              )}
            </TabsContent>

            {/* Services Results */}
            <TabsContent value="services" className="space-y-4">
              {results.services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.services.map((service) => (
                    <Card key={service.id} className="p-4 hover:shadow-lg transition-shadow">
                      <h3 className="font-semibold mb-2">{service.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/listings?category=${service.id}`}>
                          {t('common.view_listings')}
                        </a>
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t('search.no_services')}</p>
                </Card>
              )}
            </TabsContent>

            {/* Users Results */}
            <TabsContent value="users" className="space-y-4">
              {results.users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {results.users.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">{t('search.no_users')}</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!loading && resultCount === 0 && query && (
          <Card className="p-12 text-center">
            <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">{t('search.no_results_found')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('search.try_different_keywords')}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              {t('common.back_to_home')}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
