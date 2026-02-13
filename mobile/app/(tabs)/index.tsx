import { Link } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React from 'react';
// import { useAuth } from '@/context/AuthContext';
// Button not needed on this screen; keep UI consistent with links
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { Search, Users, Sparkles, Heart, Star } from 'lucide-react-native';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { getListingsWithUsers, getWishes } from '@/services/data';
import AppLogo from '@/components/ui/AppLogo';

// Hero Logo SVG converted to text representation
const HeroLogo = () => (
  <View style={cn('h-20 w-20 bg-card rounded-full items-center justify-center mb-6 shadow-lg')}>
    <AppLogo size={36} />
  </View>
);

export default function HomeScreen() {
  // const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [featured, setFeatured] = React.useState<Array<{ listing: any; user: any }>>([]);
  const [featuredWishes, setFeaturedWishes] = React.useState<any[]>([]);
  const { setFade } = useHeaderFade();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [data, wishes] = await Promise.all([
          getListingsWithUsers(),
          getWishes({ count: 2 }),
        ]);
        if (mounted) {
          setFeatured(data.slice(0, 4));
          setFeaturedWishes(wishes);
        }
      } catch {
        if (mounted) {
          setFeatured([]);
          setFeaturedWishes([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  return (
    <View style={cn('flex-1 bg-background')}>
      {/* Render content first so BlurView can sample behind it */}
      <ScrollView
        style={cn('flex-1')}
        contentContainerStyle={{}}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y || 0;
          setFade(computeFade(y));
        }}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={cn('mx-4 my-4 rounded-xl overflow-hidden shadow-xl')}> 
          <View style={cn('w-full py-16 px-6 items-center bg-primary')}> 
            <HeroLogo />
            <Text style={cn('text-3xl font-bold mb-4 text-primary-foreground text-center')}>
              Welcome to SkillSwap!
            </Text>
            <Text style={cn('text-lg mb-8 text-primary-foreground text-center max-w-[640px]')}> 
              SkillSwap is your vibrant hub to share your skills and services with your community — unlock your potential, offer what you do best, and discover what you need in return. Whether you're trading for a service, a product, or turning your talent into income, SkillSwap helps you get the most out of what you’re great at.
            </Text>
            <View style={cn('gap-4 w-full items-center')}> 
              <Link href="/listings">
                <View style={cn('px-6 py-3 rounded-lg bg-accent shadow-md')}>
                  <Text style={cn('text-accent-foreground font-semibold text-center')}>Browse Listings</Text>
                </View>
              </Link>
              <Link href="/listings/new">
                <View style={cn('px-6 py-3 rounded-lg border border-accent bg-card')}>
                  <Text style={cn('text-accent font-semibold text-center')}>Post a Listing</Text>
                </View>
              </Link>
            </View>
          </View>
        </View>

        {/* How it Works Section */}
        <View style={cn('px-6 py-16')}>
          <Text style={cn('text-3xl font-bold text-foreground text-center mb-12')}>
            How SkillSwap Works
          </Text>
          <View style={cn('gap-6')}>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Search size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">1. Offer & Request</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                List the skills you can offer and the services you're looking for in return. Be specific to attract the right swaps!
              </CardDescription>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Sparkles size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">2. Find a Match</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                Browse listings by category or use our AI Matchmaker to find potential exchanges based on your profile.
              </CardDescription>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Users size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">3. Connect & Swap</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                Use in-app chat to discuss details and schedule your service exchange. Happy swapping!
              </CardDescription>
            </Card>
          </View>
        </View>

        {/* Featured Listings Section */}
        <View style={cn('px-6 py-16')}>
          <Text style={cn('text-3xl font-bold text-foreground text-center mb-12')}>
            Featured Listings
          </Text>
          {loading ? (
            <View style={cn('items-center py-8')}>
              <ActivityIndicator />
            </View>
          ) : featured.length > 0 ? (
            <View>
              {featured.map(({ listing, user }) => (
                <ServiceCard key={listing.id} listing={listing} user={user} />
              ))}
              <View style={cn('items-center mt-4')}>
                <Link href="/listings">
                  <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                    <Text style={cn('text-primary font-semibold')}>View All Listings</Text>
                  </View>
                </Link>
              </View>
            </View>
          ) : (
            <View style={cn('items-center py-8 border border-dashed border-destructive/50 rounded-lg bg-card')}> 
              <Search size={48} color="#6b7280" />
              <Text style={cn('mt-4 text-xl font-semibold text-foreground')}>No Listings to Display</Text>
              <Text style={cn('mt-2 text-muted-foreground text-center px-4')}>
                There are no service listings available at the moment. This might be due to a connection issue.
              </Text>
              <View style={cn('items-center mt-4')}>
                <Link href="/listings">
                  <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                    <Text style={cn('text-primary font-semibold')}>View All Listings</Text>
                  </View>
                </Link>
              </View>
            </View>
          )}
        </View>

        {/* Community Wishes Section */}
        <View style={cn('px-6 py-16')}>
          <View style={cn('items-center mb-10')}> 
            <View style={cn('h-px w-full bg-border absolute top-1/2')} />
            <Text style={cn('text-3xl font-bold text-primary tracking-wide bg-background px-6')}>تَهَادَوْا تَحَابُّوا</Text>
          </View>
          <View style={cn('gap-6')}>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 bg-accent/10 rounded-full mb-2')}>
                  <Heart size={32} color="#D2691E" />
                </View>
                <CardTitle className="text-center">Make Someone's Wishes Come True!</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-2">Your generosity can make a real difference. Contribute to our community fund to help fulfill the wishes of those in need.</CardDescription>
              <CardFooter className="items-center justify-center">
                <Link href="/wishes/donate">
                  <View style={cn('px-6 py-3 rounded-lg bg-accent')}>
                    <Text style={cn('text-accent-foreground font-semibold')}>Gift Now</Text>
                  </View>
                </Link>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 bg-primary/10 rounded-full mb-2')}>
                  <Star size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">Make Your Wishes Come True!</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-2">If you're facing hardship and need something you can't afford, let the community know. Post a wish and let us help.</CardDescription>
              <CardFooter className="items-center justify-center">
                <Link href="/wishes/request">
                  <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                    <Text style={cn('text-primary font-semibold')}>Make a Wish</Text>
                  </View>
                </Link>
              </CardFooter>
            </Card>
          </View>
          {featuredWishes.length > 0 && (
            <View style={cn('mt-6 gap-4')}>
              {featuredWishes.map((wish) => {
                const raised = Number(wish.totalDonated || 0);
                const goal = Number(wish.goalAmount || 1);
                const pct = Math.min(100, Math.round((raised / goal) * 100));
                return (
                  <Card key={wish.id}>
                    <CardHeader>
                      <CardTitle className="text-center">{wish.title || t('wishes.request')}</CardTitle>
                    </CardHeader>
                    <CardDescription className="text-center px-4 pb-2">
                      {wish.description || ''}
                    </CardDescription>
                    <CardFooter className="items-center justify-center">
                      <Link href={`/wishes/${wish.id}`}>
                        <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                          <Text style={cn('text-primary font-semibold')}>{t('common.view') || 'View'}</Text>
                        </View>
                      </Link>
                    </CardFooter>
                    <CardFooter className="items-center justify-center">
                      <Text style={cn('text-xs text-muted-foreground')}>
                        {raised} / {goal} {wish.currency || 'EGP'} ({pct}%)
                      </Text>
                    </CardFooter>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Final CTAs remain part of HomePageCTAs on web; mobile keeps hero CTAs for now */}
      </ScrollView>
      {/* Global header overlays from root; fade is driven via context */}
    </View>
  );
}
