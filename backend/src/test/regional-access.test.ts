import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { canAccessCountry, isMiddleEastCountry, normalizeCountryCode } from '../core/constants';

const mockVerifyIdToken = jest.fn();
const mockUserDocGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockUserDocGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('firebase-admin', () => ({
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  firestore: () => ({ collection: mockCollection }),
}));

import { SearchController } from '../nest/search/search.controller';

function userSnapshot(fields: Record<string, unknown>, exists = true) {
  return {
    exists,
    get: (field: string) => fields[field],
  };
}

describe('regional lobby authorization', () => {
  const searchListings = jest.fn();
  let controller: SearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    searchListings.mockResolvedValue({ hits: [], page: 0, nbPages: 0, nbHits: 0 });
    controller = new SearchController({ searchListings } as any);
  });

  it('normalizes canonical codes and supported country names', () => {
    expect(normalizeCountryCode('Egypt')).toBe('EG');
    expect(normalizeCountryCode('United Arab Emirates')).toBe('AE');
    expect(isMiddleEastCountry('Pakistan')).toBe(true);
    expect(canAccessCountry('Egypt', 'Saudi Arabia', true)).toBe(true);
    expect(canAccessCountry('Egypt', 'Saudi Arabia', false)).toBe(false);
  });

  it('rejects an unauthenticated lobby request even when client flags are forged', async () => {
    await expect(controller.listings('', '', '', undefined, undefined, undefined, '0', '20', 'MIDDLE_EAST_LOBBY', {
      headers: {},
      query: { isPro: 'true', userCountry: 'EG' },
    } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(searchListings).not.toHaveBeenCalled();
  });

  it.each([
    ['Basic', true, new Date(Date.now() + 60_000)],
    ['Business', true, new Date(Date.now() + 60_000)],
    ['Pro', false, new Date(Date.now() + 60_000)],
    ['Pro', true, new Date(Date.now() - 60_000)],
  ])('rejects non-entitled membership %s active=%s', async (plan, active, endDate) => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'member-1' });
    mockUserDocGet.mockResolvedValue(userSnapshot({
      membership: { plan, active, endDate },
      'profile.country': 'Egypt',
    }));
    await expect(controller.listings('', '', '', undefined, undefined, undefined, '0', '20', 'MIDDLE_EAST_LOBBY', {
      headers: { authorization: 'Bearer local-test-token' },
    } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an entitled user whose profile country is missing', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'member-1' });
    mockUserDocGet.mockResolvedValue(userSnapshot({
      membership: { plan: 'Pro', active: true, endDate: new Date(Date.now() + 60_000) },
    }));
    await expect(controller.listings('', '', '', undefined, undefined, undefined, '0', '20', 'MIDDLE_EAST_LOBBY', {
      headers: { authorization: 'Bearer local-test-token' },
    } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses only server-verified membership and profile country for an entitled user', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'member-1' });
    mockUserDocGet.mockResolvedValue(userSnapshot({
      membership: { plan: 'Pro', active: true, endDate: new Date(Date.now() + 60_000) },
      'profile.country': 'Egypt',
    }));
    await controller.listings('design', '', '', undefined, undefined, undefined, '0', '20', 'MIDDLE_EAST_LOBBY', {
      headers: { authorization: 'Bearer local-test-token' },
      query: { isPro: 'false', userCountry: 'US' },
    } as any);
    expect(searchListings).toHaveBeenCalledWith(expect.objectContaining({
      q: 'design', region: 'MIDDLE_EAST_LOBBY', userCountry: 'Egypt', isPro: true,
    }));
  });
});
