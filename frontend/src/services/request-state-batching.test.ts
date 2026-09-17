import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/services/firebase', () => ({
  auth: { currentUser: { uid: 'viewer-1', getIdToken } },
}));

import { fetchListingRequestState } from './api';

describe('listing request-state batching', () => {
  beforeEach(() => {
    getIdToken.mockClear();
  });

  it('coalesces simultaneous cards and duplicate listing IDs into one caller-scoped request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      states: {
        'listing-1': { state: 'pending', requestId: 'request-1' },
        'listing-2': { state: 'none' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const [first, duplicate, second] = await Promise.all([
      fetchListingRequestState('listing-1'),
      fetchListingRequestState('listing-1'),
      fetchListingRequestState('listing-2'),
    ]);

    expect(first).toMatchObject({ state: 'pending', requestId: 'request-1' });
    expect(duplicate).toEqual(first);
    expect(second).toEqual({ state: 'none' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/requests/listing-status');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      listingIds: ['listing-1', 'listing-2'],
    });
  });
});
