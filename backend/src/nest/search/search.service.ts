import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class SearchService {
  async searchListings(opts: { q: string; category: string; location: string; page: number; pageSize?: number }) {
    const { q, category, location } = opts;
    const page = Number.isFinite(opts.page) ? Number(opts.page) : 0;
    const pageSize = Math.min(50, Math.max(1, Number.isFinite(opts.pageSize as any) ? Number(opts.pageSize) : 20));

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const algoliasearch = require('algoliasearch');
      const appId = process.env.ALGOLIA_APP_ID;
      const apiKey = process.env.ALGOLIA_API_KEY;
      const indexName = process.env.ALGOLIA_INDEX || 'listings';
      if (appId && apiKey) {
        const client = algoliasearch(appId, apiKey);
        const index = client.initIndex(indexName);
        const filters: string[] = [];
        if (category) filters.push(`category:"${category}"`);
        if (location) filters.push(`location:"${location}"`);
        const result = await index.search(q || '', {
          page,
          hitsPerPage: pageSize,
          filters: filters.length ? filters.join(' AND ') : undefined,
        });
        return { hits: result.hits, page: result.page, nbPages: result.nbPages, nbHits: result.nbHits };
      }
    } catch (e) {
      console.warn('Algolia search skipped', e);
    }

    const snap = await admin.firestore().collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const lcq = q.toLowerCase();
    const results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(l => !category || (l.category || l.offeredService?.category || '').toLowerCase() === category.toLowerCase())
      .filter(l => !location || String(l.location || '').toLowerCase().includes(location.toLowerCase()))
      .filter(l => !lcq || (String(l.title || l.offeredService?.title || '').toLowerCase().includes(lcq) || String(l.description || l.offeredService?.description || '').toLowerCase().includes(lcq)));
    const paged = results.slice(page * pageSize, (page + 1) * pageSize);
    return { hits: paged, page, nbPages: Math.ceil(results.length / pageSize), nbHits: results.length };
  }
}
