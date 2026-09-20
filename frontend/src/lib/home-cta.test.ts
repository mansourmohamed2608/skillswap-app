import { describe, expect, it } from 'vitest';
import { getCategoryBrowseAction, getJoinPrimaryAction } from './home-cta';

describe('home join CTA', () => {
  it('uses registration language for signed-out visitors', () => {
    expect(getJoinPrimaryAction(false)).toEqual({
      href: '/auth/signup',
      translationKey: 'home.joinCta.primary',
    });
  });

  it('uses listing language for authenticated users', () => {
    expect(getJoinPrimaryAction(true)).toEqual({
      href: '/listings/new',
      translationKey: 'home.joinCta.authenticatedPrimary',
    });
  });
});

describe('home category CTA', () => {
  it('describes and targets the category index', () => {
    expect(getCategoryBrowseAction()).toEqual({
      href: '/categories',
      translationKey: 'home.categories.viewAll',
    });
  });
});
