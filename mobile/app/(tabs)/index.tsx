import { Link } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import React from 'react';
// import { useAuth } from '@/context/AuthContext';
// Button not needed on this screen; keep UI consistent with links
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useHeaderFade } from '@/context/HeaderFadeContext';
import { computeFade } from '@/components/layout/constants';
import { Heart, Search, Sparkles, Star, Users } from 'lucide-react-native';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { getListingsWithUsers, getWishes } from '@/services/data';
import { getServiceCategories, type ServiceCategoryDefinition } from '@/services/api';
import { categoryArtwork } from '../../src/constants/categoryArtwork';

const CATEGORY_SURFACES = ['#e8f5ee', '#fff1dc', '#eef5dd', '#e5f4f1'];

export default function HomeScreen() {
  // const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [featured, setFeatured] = React.useState<Array<{ listing: any; user: any }>>([]);
  const [featuredWishes, setFeaturedWishes] = React.useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = React.useState<ServiceCategoryDefinition[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = React.useState(false);
  const { setFade } = useHeaderFade();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [data, wishes, categories] = await Promise.all([
          getListingsWithUsers(),
          getWishes({ count: 2 }),
          getServiceCategories().catch(() => []),
        ]);
        if (mounted) {
          setFeatured(data.slice(0, 4));
          setFeaturedWishes(wishes);
          setServiceCategories(categories);
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
        <View style={[cn('mx-4 my-4 rounded-3xl overflow-hidden shadow-xl'), { backgroundColor: '#edf7f1' }]}> 
          <View style={cn('w-full p-4 items-center')}> 
            <Image
              source={require('../../assets/r-o-hero-approved.jpg')}
              accessibilityLabel="A dentist and a reel creator exchanging services through R&O"
              style={{ width: '100%', aspectRatio: 1.5, borderRadius: 20 }}
              resizeMode="contain"
            />
            <View style={[cn('w-full mt-4 p-5 rounded-2xl'), { backgroundColor: 'rgba(255,255,255,0.86)' }]}>
            <Text style={cn('text-xs font-bold uppercase tracking-widest text-primary text-center')}>{t('home.hero_kicker')}</Text>
            <Text style={cn('text-3xl font-bold mt-3 mb-3 text-foreground text-center')}>
              {t('home.hero_title')}
            </Text>
            <Text style={cn('text-base mb-6 text-muted-foreground text-center')}> 
              {t('home.hero_body')}
            </Text>
            <View style={cn('gap-4 w-full items-center')}> 
              <Link href="/listings/new">
                <View style={[cn('px-7 py-3 rounded-xl shadow-md'), { backgroundColor: '#0e2b28' }]}>
                  <Text style={cn('text-white font-semibold text-center')}>{t('home.post_listing')}</Text>
                </View>
              </Link>
              <Link href="/listings">
                <View style={[cn('px-7 py-3 rounded-xl'), { backgroundColor: '#ff9a2f' }]}>
                  <Text style={cn('text-foreground font-semibold text-center')}>{t('home.browse_listings')}</Text>
                </View>
              </Link>
            </View>
            </View>
          </View>
        </View>

        <View style={[cn('mx-4 my-4 px-5 py-10 rounded-3xl'), { backgroundColor: '#fff9ee' }]}>
          <Text style={cn('text-3xl font-bold text-foreground text-center')}>{t('home.explore_title')}</Text>
          <Text style={cn('mt-3 text-base leading-6 text-muted-foreground text-center')}>{t('home.explore_body')}</Text>
          <View style={cn('items-center mt-6')}><Link href="/pricing"><View style={cn('px-6 py-3 rounded-lg bg-accent')}><Text style={cn('text-accent-foreground font-semibold')}>{t('home.subscribe_now')}</Text></View></Link></View>
          <View style={cn('flex-row flex-wrap justify-between mt-7')}>
            {(categoriesExpanded ? serviceCategories : serviceCategories.slice(0, 6)).map(({ id, label }, index) => {
              const artwork = categoryArtwork[id];
              return (
                <Link href={`/listings?category=${encodeURIComponent(label)}`} key={id} style={{ width: '31%', marginBottom: 14 }}>
                  <View style={[cn('min-h-[122px] rounded-2xl border border-border items-center justify-center px-2 py-2'), { backgroundColor: CATEGORY_SURFACES[index % CATEGORY_SURFACES.length] }]}>
                    {artwork ? <Image source={artwork} style={{ width: 76, height: 76 }} resizeMode="contain" /> : <Sparkles size={32} color="#278a78" />}
                    <Text numberOfLines={2} style={cn('mt-1 text-xs text-center font-semibold text-foreground')}>{label}</Text>
                  </View>
                </Link>
              );
            })}
          </View>
          {serviceCategories.length > 6 ? <View style={cn('items-center mt-4')}><Pressable accessibilityRole="button" accessibilityState={{ expanded: categoriesExpanded }} onPress={() => setCategoriesExpanded((value) => !value)} style={cn('px-6 py-3 rounded-lg border border-primary')}><Text style={cn('text-primary font-semibold')}>{categoriesExpanded ? t('home.see_less') : t('home.see_more')}</Text></Pressable></View> : null}
        </View>

        {/* How it Works Section */}
        <View style={[cn('mx-4 my-4 px-5 py-12 rounded-3xl'), { backgroundColor: '#eaf5ef' }]}>
          <Text style={cn('text-3xl font-bold text-foreground text-center mb-12')}>
            {t('home.how_it_works')}
          </Text>
          <View style={cn('gap-6')}>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Search size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">{t('home.step1_title')}</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                {t('home.step1_body')}
              </CardDescription>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Sparkles size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">{t('home.step2_title')}</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                {t('home.step2_body')}
              </CardDescription>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 rounded-full bg-primary/10 mb-2')}>
                  <Users size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">{t('home.step3_title')}</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-4">
                {t('home.step3_body')}
              </CardDescription>
            </Card>
          </View>
        </View>

        {/* Featured Listings Section */}
        <View style={[cn('mx-4 my-4 px-5 py-12 rounded-3xl'), { backgroundColor: '#fff7e9' }]}>
          <Text style={cn('text-3xl font-bold text-foreground text-center mb-12')}>
            {t('home.featured_listings')}
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
                    <Text style={cn('text-primary font-semibold')}>{t('home.view_all_listings')}</Text>
                  </View>
                </Link>
              </View>
            </View>
          ) : (
            <View style={cn('items-center py-8 border border-dashed border-destructive/50 rounded-lg bg-card')}> 
              <Search size={48} color="#6b7280" />
              <Text style={cn('mt-4 text-xl font-semibold text-foreground')}>{t('home.no_listings_title')}</Text>
              <Text style={cn('mt-2 text-muted-foreground text-center px-4')}>
                {t('home.no_listings_body')}
              </Text>
              <View style={cn('items-center mt-4')}>
                <Link href="/listings">
                  <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                    <Text style={cn('text-primary font-semibold')}>{t('home.view_all_listings')}</Text>
                  </View>
                </Link>
              </View>
            </View>
          )}
        </View>

        {/* Community Wishes Section */}
        <View style={[cn('mx-4 my-4 px-5 py-12 rounded-3xl'), { backgroundColor: '#eef7ee' }]}>
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
                <CardTitle className="text-center">{t('home.wishes_donate_title')}</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-2">{t('home.wishes_donate_body')}</CardDescription>
              <CardFooter className="items-center justify-center">
                <Link href="/wishes/donate">
                  <View style={cn('px-6 py-3 rounded-lg bg-accent')}>
                    <Text style={cn('text-accent-foreground font-semibold')}>{t('home.wishes_donate_button')}</Text>
                  </View>
                </Link>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader className="items-center">
                <View style={cn('p-3 bg-primary/10 rounded-full mb-2')}>
                  <Star size={32} color="#2b6b4f" />
                </View>
                <CardTitle className="text-center">{t('home.wishes_request_title')}</CardTitle>
              </CardHeader>
              <CardDescription className="text-center px-4 pb-2">{t('home.wishes_request_body')}</CardDescription>
              <CardFooter className="items-center justify-center">
                <Link href="/wishes/request">
                  <View style={cn('px-6 py-3 rounded-lg border border-primary')}>
                    <Text style={cn('text-primary font-semibold')}>{t('home.wishes_request_button')}</Text>
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
