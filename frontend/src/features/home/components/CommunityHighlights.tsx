'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getListingCoverImage } from '@/lib/listingImages';
import type { CommunityHighlights as CommunityHighlightsData } from '@/types';

type Props = { highlights: CommunityHighlightsData };

const previewStories = [
  { name: 'Dina Farid', skill: 'Cooking lessons', story: 'A recipe exchange that became a weekly neighborhood class.', image: '/ro/home/step-find-match.webp' },
  { name: 'Karim Samir', skill: 'Photography help', story: 'A portfolio shoot traded for a bike safety lesson.', image: '/ro/home/step-connect-exchange.webp' },
];

function Initials({ name }: { name: string }) {
  return <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#0e2b28,#278a78)] text-xl font-black text-white">{name.trim().charAt(0).toUpperCase() || 'R'}</span>;
}

function CommunityCard({ children, href }: { children: React.ReactNode; href?: string }) {
  const className = 'group flex min-h-44 items-center gap-4 overflow-hidden rounded-2xl border border-[#b9decc] bg-[linear-gradient(140deg,#f3f9f6,#fff)] p-5 shadow-[0_12px_28px_rgb(14_43_40/0.08)] transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_18px_34px_rgb(14_43_40/0.12)]';
  return href ? <Link href={href} className={className}>{children}</Link> : <article className={className}>{children}</article>;
}

function StoryCard({ story }: { story: (typeof previewStories)[number] }) {
  return <CommunityCard><Initials name={story.name} /><div className="min-w-0 flex-1"><span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ro-emerald)]">Community story</span><h3 className="mt-1 text-xl font-medium text-[var(--ro-deep-teal)]">{story.name}</h3><p className="mt-1 text-sm font-bold text-[var(--ro-jade)]">{story.skill}</p><p className="mt-2 text-sm leading-relaxed text-[var(--ro-deep-teal)]/80">{story.story}</p></div><Image src={story.image} alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-2xl object-contain sm:size-[88px]" /></CommunityCard>;
}

export function CommunityHighlights({ highlights }: Props) {
  const { i18n } = useTranslation();
  const arabic = i18n.language?.startsWith('ar');
  const member = highlights.memberHighlights[0];
  const completedSwap = highlights.completedSwaps[0];

  return <section aria-labelledby="community-highlights-title" className="pb-2">
    <div className="mb-6"><h2 id="community-highlights-title" className="text-2xl font-black tracking-[-0.035em] text-[var(--ro-deep-teal)] sm:text-3xl lg:text-4xl">{arabic ? 'أبرز ما في المجتمع' : 'Community highlights'}</h2><p className="mt-1 text-sm font-semibold text-[var(--ro-jade)]">{arabic ? 'أعضاء موثوقون وتبادلات مكتملة من مجتمع R&O' : 'Top-rated members and recently completed swaps from R&O'}</p><span className="mt-3 block h-1 w-[72px] rounded-full bg-[var(--ro-orange)]" aria-hidden="true" /></div>
    <div className="grid gap-4 md:grid-cols-2">
      {member ? <CommunityCard href={`/profile/${member.id}`}><Initials name={member.name} /><div className="min-w-0 flex-1"><span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ro-emerald)]">Top-rated member</span><h3 className="mt-1 truncate text-xl font-medium text-[var(--ro-deep-teal)]">{member.name}</h3><p className="mt-1 flex items-center gap-1 text-sm font-bold text-[var(--ro-jade)]"><Star className="size-4 fill-current" />{member.rating.toFixed(1)} · {member.reviewsCount} reviews</p>{member.location ? <p className="mt-2 text-sm text-[var(--ro-deep-teal)]/80">{member.location}</p> : null}</div><Image src="/ro/home/step-find-match.webp" alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-2xl object-contain sm:size-[88px]" /></CommunityCard> : <StoryCard story={previewStories[0]} />}
      {completedSwap ? <CommunityCard href={`/listings/${completedSwap.id}`}><Initials name={completedSwap.ownerName || completedSwap.title} /><div className="min-w-0 flex-1"><span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ro-emerald)]">Completed swap</span><h3 className="mt-1 truncate text-xl font-medium text-[var(--ro-deep-teal)]">{completedSwap.title}</h3><p className="mt-1 text-sm font-bold text-[var(--ro-jade)]">{completedSwap.category}</p><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--ro-deep-teal)]/80">{completedSwap.description}</p></div><Image src={completedSwap.imageUrl || getListingCoverImage(completedSwap.category)} alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-2xl object-cover sm:size-[88px]" /></CommunityCard> : <StoryCard story={previewStories[1]} />}
    </div>
  </section>;
}
