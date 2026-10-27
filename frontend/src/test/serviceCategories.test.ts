import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchServiceCategories } from '@/services/serviceCategories';

describe('service category contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consumes category IDs and labels from the backend response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ categories: [{ id: 'web-development', label: 'Web Development' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchServiceCategories('/api/categories')).resolves.toEqual([
      { id: 'web-development', label: 'Web Development' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/categories', { cache: 'no-store' });
  });

  it('fails gracefully on an invalid category response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ categories: null }) }));
    await expect(fetchServiceCategories()).rejects.toThrow('Invalid category response');
  });

  it('applies the client presentation order while preserving canonical IDs and labels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [
          { id: 'babysitting', label: 'Babysitting' },
          { id: 'content-creation', label: 'Content creation' },
          { id: 'graphic-design', label: 'Graphic design' },
          { id: 'reels-making', label: 'Reels making' },
        ],
      }),
    }));

    const categories = await fetchServiceCategories();
    expect(categories.map(({ id }) => id)).toEqual([
      'content-creation', 'reels-making', 'graphic-design', 'babysitting',
    ]);
  });
});
