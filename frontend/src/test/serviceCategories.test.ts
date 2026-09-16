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
});
