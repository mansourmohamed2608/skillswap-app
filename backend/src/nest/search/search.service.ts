import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { haversineDistanceKm, readGeoPoint } from '../../core/geo';
import { canAccessCountry } from '../../core/constants';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  private isVisibleListingStatus(status: unknown) {
    const normalized = String(status || 'open').trim().toLowerCase();
    return !['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
  }

  private async getOwnerMetaMap(ownerIds: string[]) {
    const ids = Array.from(new Set(ownerIds.map((id) => String(id || '').trim()).filter(Boolean)));
    const map: Record<string, { name?: string; username?: string; location?: string; country?: string }> = {};
    if (!ids.length) return map;
    const refs = ids.map((uid) => admin.firestore().collection('publicProfiles').doc(uid));
    const snaps = await admin.firestore().getAll(...refs);
    for (const snap of snaps) {
      const data: any = snap.exists ? snap.data() || {} : {};
      map[snap.id] = {
        name: String(data?.name || '').trim() || undefined,
        username: String(data?.username || '').trim() || undefined,
        location: String(data?.location || '').trim() || undefined,
        country: String(data?.country || '').trim() || undefined,
      };
    }
    return map;
  }

  private isLikelyLowQualityListing(listing: any) {
    const title = String(listing?.offeredService?.title || listing?.title || '').trim();
    const description = String(listing?.offeredService?.description || listing?.description || '').trim();
    if (title.length < 2 || description.length < 4) return true;
    if (/([*#@!$%^&_=+~`|\\/.-])\1{2,}/.test(title) || /([*#@!$%^&_=+~`|\\/.-])\1{2,}/.test(description)) {
      return true;
    }
    const letters = (title.match(/\p{L}/gu) || []).length + (description.match(/\p{L}/gu) || []).length;
    return letters < 4;
  }

  async searchListings(opts: {
    q: string;
    category: string;
    location: string;
    page: number;
    pageSize?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
    userCountry?: string;
    isPro?: boolean;
    region?: string;
  }) {
    const { q, category, location, userCountry, isPro = false, region } = opts;
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
        const escAlgolia = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        if (category) filters.push(`category:"${escAlgolia(category)}"`);
        if (location) filters.push(`location:"${escAlgolia(location)}"`);
        const result = await index.search(q || '', {
          page,
          hitsPerPage: pageSize,
          filters: filters.length ? filters.join(' AND ') : undefined,
          ...(center ? { aroundLatLng: `${center.lat}, ${center.lng}` } : {}),
          ...(center && radiusKm !== undefined ? { aroundRadius: Math.round(radiusKm * 1000) } : {}),
        });
        const rawHits = (result.hits || []).map((hit: any) => {
          const geo = readGeoPoint((hit as any)?._geoloc || (hit as any)?.geo);
          const distanceKm = center && geo ? haversineDistanceKm(center, geo) : undefined;
          return {
            ...hit,
            ...(distanceKm !== undefined ? { distanceKm: Number(distanceKm.toFixed(2)) } : {}),
          };
        });
        const refinedHits = rawHits
          .filter((hit: any) => this.isVisibleListingStatus(hit?.status))
          .filter((hit: any) => !this.isLikelyLowQualityListing(hit))
          .filter((hit: any) => !category || String(hit.category || hit.offeredService?.category || '').toLowerCase().trim() === category.toLowerCase().trim())
          .filter((hit: any) => !location || String(hit.location || '').toLowerCase().includes(location.toLowerCase()))
          .filter((hit: any) => {
            if (!q) return true;
            const lowered = q.toLowerCase();
            const haystack = [
              hit.title,
              hit.description,
              hit.offeredService?.title,
              hit.offeredService?.description,
              hit.requestedService?.title,
              hit.requestedService?.description,
              hit.requestedProduct?.name,
              hit.requestedProduct?.description,
            ]
              .map((value: any) => String(value || '').toLowerCase())
              .join(' ');
            return haystack.includes(lowered);
          })
          .filter((hit: any) => {
            // Enforce Middle East Lobby access.
            if (!userCountry || region !== 'MIDDLE_EAST_LOBBY') return true;
            const ownerCountry = String(hit.ownerCountry || hit.location || '').trim();
            if (!ownerCountry) return false;
            return canAccessCountry(userCountry, ownerCountry, isPro);
          });

        if (refinedHits.length > 0) {
          return { hits: refinedHits, page: result.page, nbPages: result.nbPages, nbHits: refinedHits.length };
        }
        // If index is stale/misaligned with current schema, fall back to Firestore search.
        this.logger.warn('Algolia returned 0 hits, falling back to Firestore search', {
          q: q || '',
          category: category || '',
          location: location || '',
        });
      }
    } catch (e) {
      this.logger.warn('Algolia search skipped', e);
    }

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      snap = await admin.firestore().collection('listings')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
    } catch {
      try {
        snap = await admin.firestore().collection('listings')
          .orderBy('postedDate', 'desc')
          .limit(100)
          .get();
      } catch {
        snap = await admin.firestore().collection('listings')
          .limit(200)
          .get();
      }
    }
    const lcq = q.toLowerCase();
    const filtered = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter((l) => this.isVisibleListingStatus((l as any).status))
      .filter((l) => !this.isLikelyLowQualityListing(l));
    const ownerMetaMap = await this.getOwnerMetaMap(filtered.map((l: any) => String(l.userId || l.offeredByUserId || '').trim()));
    const enriched = filtered.map((l: any) => {
      const ownerId = String(l.userId || l.offeredByUserId || '').trim();
      const ownerMeta = ownerMetaMap[ownerId] || {};
      return {
        ...l,
        ownerName: ownerMeta.name,
        ownerUsername: ownerMeta.username,
        ownerLocation: ownerMeta.location,
        ownerCountry: ownerMeta.country,
      };
    });
    const refined = enriched
      .filter(l => !category || (l.category || l.offeredService?.category || '').toLowerCase().trim() === category.toLowerCase().trim())
      .filter(l => {
        if (!location) return true;
        const locationHaystack = [
          l.location,
          l.ownerLocation,
          l.ownerCountry,
        ].map((v) => String(v || '').toLowerCase()).join(' ');
        return locationHaystack.includes(location.toLowerCase());
      })
      .filter((l) => {
        if (!lcq) return true;
        const haystack = [
          l.title,
          l.description,
          l.category,
          l.location,
          l.offeredService?.title,
          l.offeredService?.description,
          l.offeredService?.category,
          l.requestedService?.title,
          l.requestedService?.description,
          l.requestedService?.category,
          l.requestedProduct?.name,
          l.requestedProduct?.description,
          l.ownerName,
          l.ownerUsername,
          l.ownerLocation,
          l.ownerCountry,
        ]
          .map((v) => String(v || '').toLowerCase())
          .join(' ');
        return haystack.includes(lcq);
      })
      .filter((l) => {
        // Enforce Middle East Lobby access: check if user is allowed to see this listing.
        if (!userCountry || region !== 'MIDDLE_EAST_LOBBY') return true;
        const ownerCountry = String(l.ownerCountry || l.location || '').trim();
        if (!ownerCountry) return false;
        return canAccessCountry(userCountry, ownerCountry, isPro);
      });
    const withDistance = refined.map((l) => {
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
