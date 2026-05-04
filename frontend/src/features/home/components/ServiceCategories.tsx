'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Code,
  Palette,
  Music,
  BookOpen,
  Dumbbell,
  Briefcase,
  Camera,
  HomeIcon,
  ArrowRight,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'programming',
    name: 'Programming',
    icon: Code,
    description: 'Web, app, and software development',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'design',
    name: 'Design',
    icon: Palette,
    description: 'UI/UX, graphics, and branding',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'music',
    name: 'Music & Audio',
    icon: Music,
    description: 'Lessons, production, and mixing',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'education',
    name: 'Education',
    icon: BookOpen,
    description: 'Languages, tutoring, and courses',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'fitness',
    name: 'Fitness & Wellness',
    icon: Dumbbell,
    description: 'Training, yoga, and health coaching',
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'business',
    name: 'Business & Career',
    icon: Briefcase,
    description: 'Consulting, mentoring, and advice',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'photography',
    name: 'Photography & Video',
    icon: Camera,
    description: 'Photo services and videography',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'home',
    name: 'Home & Living',
    icon: HomeIcon,
    description: 'Repairs, cleaning, and maintenance',
    color: 'from-lime-500 to-green-500',
  },
];

export function ServiceCategories() {
  const { t } = useTranslation();

  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-semibold mb-4">
          {t('home.categories.title', 'Explore Service Categories')}
        </h2>
        <p className="text-muted-foreground text-lg">
          {t('home.categories.subtitle', 'Find exactly what you need to learn and teach')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.id} href={`/listings?category=${category.id}`}>
              <div
                className={`bg-gradient-to-br ${category.color} p-6 rounded-lg text-white cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 h-full flex flex-col justify-between`}
              >
                <div>
                  <Icon className="h-8 w-8 mb-3 opacity-90" />
                  <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                  <p className="text-sm opacity-90">{category.description}</p>
                </div>
                <div className="mt-4 flex items-center text-sm font-medium opacity-90 hover:opacity-100">
                  {t('home.categories.browse', 'Browse')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Button size="lg" variant="outline" asChild>
          <Link href="/listings">
            {t('home.categories.viewAll', 'View All Categories')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
