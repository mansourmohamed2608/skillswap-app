import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { haversineDistanceKm, readGeoPoint } from '../../core/geo';

@Injectable()
export class SearchService {
  async searchListings(opts: {
    q: string;
    category: string;
    location: string;
    page: number;
    pageSize?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
  }) {
    const { q, category, location } = opts;
    const page = Number.isFinite(opts.page) ? Number(opts.page) : 0;
    const pageSize = Math.min(50, Math.max(1, Number.isFinite(opts.pageSize as any) ? Number(opts.pageSize) : 20));
    const nearLat = Number.isFinite(opts.nearLat as any) ? Number(opts.nearLat) : undefined;
    const nearLng = Number.isFinite(opts.nearLng as any) ? Number(opts.nearLng) : undefined;
    const radiusKm = Number.isFinite(opts.radiusKm as any) ? Math.max(0, Number(opts.radiusKm)) : undefined;
    const center = nearLat !== undefined && nearLng !== undefined ? { lat: nearLat, lng: nearLng } : undefined;

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
          ...(center ? { aroundLatLng: `${center.lat}, ${center.lng}` } : {}),
          ...(center && radiusKm !== undefined ? { aroundRadius: Math.round(radiusKm * 1000) } : {}),
        });
        const hits = (result.hits || []).map((hit: any) => {
          const geo = readGeoPoint((hit as any)?._geoloc || (hit as any)?.geo);
          const distanceKm = center && geo ? haversineDistanceKm(center, geo) : undefined;
          return {
            ...hit,
            ...(distanceKm !== undefined ? { distanceKm: Number(distanceKm.toFixed(2)) } : {}),
          };
        });
        return { hits, page: result.page, nbPages: result.nbPages, nbHits: result.nbHits };
      }
    } catch (e) {
      console.warn('Algolia search skipped', e);
    }

    const snap = await admin.firestore().collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const lcq = q.toLowerCase();
    const filtered = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(l => !category || (l.category || l.offeredService?.category || '').toLowerCase() === category.toLowerCase())
      .filter(l => !location || String(l.location || '').toLowerCase().includes(location.toLowerCase()))
      .filter(l => !lcq || (String(l.title || l.offeredService?.title || '').toLowerCase().includes(lcq) || String(l.description || l.offeredService?.description || '').toLowerCase().includes(lcq)));
    const withDistance = filtered.map((l) => {
      const geo = readGeoPoint((l as any).geo);
      const distanceKm = center && geo ? haversineDistanceKm(center, geo) : undefined;
      return { l, distanceKm };
    }).filter((entry) => {
      if (!center || radiusKm === undefined) return true;
      if (entry.distanceKm === undefined) return false;
      return entry.distanceKm <= radiusKm;
    });
    withDistance.sort((a, b) => {
      if (a.distanceKm === undefined && b.distanceKm !== undefined) return 1;
      if (a.distanceKm !== undefined && b.distanceKm === undefined) return -1;
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) return a.distanceKm - b.distanceKm;
      return 0;
    });
    const results = withDistance.map((entry) => ({
      ...entry.l,
      ...(entry.distanceKm !== undefined ? { distanceKm: Number(entry.distanceKm.toFixed(2)) } : {}),
    }));
    const paged = results.slice(page * pageSize, (page + 1) * pageSize);
    return { hits: paged, page, nbPages: Math.ceil(results.length / pageSize), nbHits: results.length };
  }
}
