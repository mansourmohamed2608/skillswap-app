import type { WishSummary } from '@/types';

const BELIEVABLE_WISHES: Array<Pick<WishSummary, 'title' | 'description' | 'category'>> = [
  {
    title: 'Need Help Improving My CV',
    description: 'Feedback from an HR professional or recruiter.',
    category: 'Career',
  },
  {
    title: 'Looking for Beginner Photography Guidance',
    description: 'A short mentoring session or learning resources.',
    category: 'Photography',
  },
  {
    title: 'Need Advice for Starting a Small Business',
    description: 'Guidance from someone with practical business experience.',
    category: 'Business',
  },
  {
    title: 'Looking for English Conversation Practice',
    description: 'Weekly practice sessions with a fluent speaker.',
    category: 'Education',
  },
];

const GENERIC_TITLE_PATTERN =
  /^(rocket\s*\d*|science\s*project|untitled|test\s*wish|wish\s*\d*|sample|demo|placeholder)/i;

function isGenericWishTitle(title?: string | null): boolean {
  const value = (title || '').trim();
  if (!value || value.length < 4) return true;
  return GENERIC_TITLE_PATTERN.test(value);
}

/** Map generic backend wish titles to believable community wish copy for homepage display. */
export function normalizeWishForDisplay(wish: WishSummary, index: number): WishSummary {
  if (!isGenericWishTitle(wish.title)) {
    return wish;
  }

  const sample = BELIEVABLE_WISHES[index % BELIEVABLE_WISHES.length];
  return {
    ...wish,
    title: sample.title,
    description: sample.description,
    category: wish.category || sample.category,
  };
}

export function normalizeWishesForDisplay(wishes: WishSummary[]): WishSummary[] {
  return wishes.map((wish, index) => normalizeWishForDisplay(wish, index));
}
