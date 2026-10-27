import { describe, expect, it } from 'vitest';
import {
  categoryPresentationOrder,
  marketplaceCategories,
  sortCategoriesByPresentationOrder,
} from '@/features/home/constants/categoryLinks';
import { categoryArtwork } from '@/features/home/constants/categoryArtwork';

const approvedFirstTwelve = [
  'content-creation',
  'reels-making',
  'graphic-design',
  'copy-writing',
  'beauty-and-makeup',
  'modeling',
  'web-development-programming',
  'media-buying',
  'social-media-management',
  'dental-care',
  'medical-consultation',
  'babysitting',
];

describe('client category presentation', () => {
  it('keeps all 29 canonical IDs unique and puts the approved 12 first', () => {
    expect(marketplaceCategories).toHaveLength(29);
    expect(new Set(categoryPresentationOrder).size).toBe(29);
    expect(categoryPresentationOrder.slice(0, 12)).toEqual(approvedFirstTwelve);
  });

  it('has distinct mapped artwork for every category', () => {
    const artwork = marketplaceCategories.map(({ id }) => categoryArtwork[id]);
    expect(artwork.every(Boolean)).toBe(true);
    expect(new Set(artwork).size).toBe(29);
  });

  it('sorts API-shaped records without changing them or duplicating IDs', () => {
    const records = [...marketplaceCategories].reverse().map(({ id, name }) => ({ id, label: name }));
    const sorted = sortCategoriesByPresentationOrder(records);
    expect(sorted.map(({ id }) => id)).toEqual(categoryPresentationOrder);
    expect(new Set(sorted.map(({ id }) => id)).size).toBe(29);
  });
});
