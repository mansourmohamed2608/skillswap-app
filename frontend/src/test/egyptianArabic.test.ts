import { describe, expect, it } from 'vitest';
import { marketplaceCategories } from '@/features/home/constants/categoryLinks';
import { getCategoryDisplayName } from '@/features/home/constants/homeCategoryRow';
import { i18n } from '@/i18n/config';
import { getServiceCategoryLabel } from '@/services/serviceCategories';

describe('Egyptian Arabic marketplace labels', () => {
  const arabic = i18n.getFixedT('ar-EG');

  it('uses Arabic for the homepage calls to action', () => {
    expect(arabic('home.hero.ctaSubscribe')).toBe('اشترك دلوقتي');
    expect(arabic('home.hero.ctaPost')).toBe('انشر إعلان');
    expect(i18n.getFixedT('en')('home.hero.ctaSubscribe')).toBe('Subscribe Now');
  });

  it('translates all 29 categories consistently from their canonical IDs and stored values', () => {
    expect(marketplaceCategories).toHaveLength(29);
    for (const category of marketplaceCategories) {
      const label = getCategoryDisplayName(category, arabic);
      expect(label).toMatch(/\p{Script=Arabic}/u);
      expect(label).not.toMatch(/[A-Za-z]/);
      expect(getServiceCategoryLabel(category.id, arabic)).toBe(label);
      expect(getServiceCategoryLabel(category.listingCategory, arabic)).toBe(label);
    }
  });
});
