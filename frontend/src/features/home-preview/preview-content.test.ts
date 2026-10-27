import { describe, expect, it } from 'vitest';
import { categories, copy, getSearchSuggestions, listings, sectionOrder } from './preview-content';

describe('home preview V3 content contract', () => {
  it('keeps the V3 section order and removes legacy giving content', () => {
    expect(sectionOrder).toEqual(['hero', 'how-it-works', 'categories', 'featured-listings', 'community-highlights', 'get-app']);
  });
  it('uses unique canonical category IDs with localized labels', () => {
    expect(new Set(categories.map((item) => item.id)).size).toBe(categories.length);
    expect(categories.map((item) => item.label.en)).toEqual([
      'Content creation', 'Reels making', 'Graphic design', 'Copy writing', 'Beauty and makeup', 'Modeling', 'Web development / programming', 'Media buying', 'Social media management', 'Dental care', 'Medical consultation', 'Babysitting', 'Study buddy', 'Pets zone', 'Ladies hangout', 'Delicious food', 'Sporty', 'Hear me out / I’m all ears', 'Diet guide', 'Share a ride / Carpooling', 'Hobby and happy', 'Business consulting', 'Photography', 'Videography', 'Video editing', 'Home / Office repair', 'AI services', 'Teaching', 'Other',
    ]);
    for (const locale of ['en', 'ar'] as const) categories.forEach((item) => expect(item.label[locale]).not.toBe(''));
  });
  it('keeps request first and offer second on every listing', () => {
    listings.forEach((item) => { expect(item.lookingFor.en).not.toBe(''); expect(item.offer.en).not.toBe(''); });
  });
  it('keeps the information required for complete featured-card bodies', () => {
    listings.forEach((item) => {
      expect(item.category.en).not.toBe(''); expect(item.title.en).not.toBe(''); expect(item.description.en).not.toBe('');
      expect(item.owner.en).not.toBe(''); expect(item.location.en).not.toBe('');
    });
    expect(copy.en.message).toBe('Message'); expect(copy.en.details).toBe('View Details');
  });
  it('labels community examples honestly and supplies preview drawer copy', () => {
    expect(copy.en.previewExamples).toContain('not live ratings');
    expect(copy.en.previewMemberExample).toContain('Preview'); expect(copy.en.previewSwapStory).toContain('Preview');
    expect(copy.en.signIn).toBe('Sign In'); expect(copy.en.signOut).toBe('Sign Out'); expect(copy.en.account).toBe('Account');
  });
  it('finds localized preview suggestions', () => {
    expect(getSearchSuggestions('photo', 'en').length).toBeGreaterThan(0);
    expect(getSearchSuggestions('تصوير', 'ar').length).toBeGreaterThan(0);
    expect(copy.en.heroLine1).toBe('Request the service you need');
  });
  it('keeps the client-approved process and CTA hierarchy', () => {
    expect(copy.en.howTitle).toBe('How R&O Works');
    expect(copy.en.steps.map((step) => step.title)).toEqual(['Request & Offer', 'Find a Match', 'Connect & Swap']);
    expect(copy.en.steps.map((step) => step.body)).toEqual([
      'Post a listing, request the service you need and offer what you can give in return whether it is a service, a product or a fee. Be specific to attract the right swaps!',
      'Find the closest people to your location who are offering the same service you’re looking for! You can browse listings by category or use our AI Matchmaker to find potential exchanges based on your profile.',
      'Use our in-app chat to discuss details and to agree on your service exchange. Happy swapping!',
    ]);
    expect(copy.en.post).toBe('Post a listing');
    expect(copy.en.browse).toBe('Browse Listings');
    expect(copy.en.subscribeNow).toBe('Subscribe Now');
    expect(copy.en.viewMore).toBe('See More');
  });
});
