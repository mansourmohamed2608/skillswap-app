import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendInAppNotification } from '../../core/notifications';
import { geocodeAddress, haversineDistanceKm, readGeoPoint, type GeoPoint } from '../../core/geo';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  async recommendations(uid: string) {
    const userDoc = await this.getVerifiedUser(uid);
    const udata: any = userDoc.data() || {};
    const userLoc = this.readLocationMeta(udata);
    const userCountry = userLoc.country;
    const userCity = userLoc.city;
    let userGeo = this.readUserGeo(udata);
    if (!userGeo) {
      const query = [udata.location, userLoc.city, userLoc.country].filter(Boolean).join(', ');
      const geocoded = query ? await geocodeAddress(query) : null;
      userGeo = geocoded?.point;
    }

    const myListSnap = await admin.firestore().collection('listings')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const prefCategory = myListSnap.empty ? '' : ((myListSnap.docs[0].data() as any).category || (myListSnap.docs[0].data() as any).offeredService?.category || '');

    const listingsSnap = await admin.firestore().collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
    const items = listingsSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(l => (l.userId || l.offeredByUserId) !== uid)
      .filter(l => !l.flagged);

    const scored = items.map(l => {
      let score = 0;
      const cat = l.category || l.offeredService?.category || '';
      const listingLoc = this.readLocationMeta(l);
      const listingGeo = this.readListingGeo(l);
      if (prefCategory && cat && cat.toLowerCase() === prefCategory.toLowerCase()) score += 3;
      const sameCountry = Boolean(userCountry && listingLoc.country && listingLoc.country.toLowerCase() === userCountry.toLowerCase());
      const sameCity = Boolean(userCity && listingLoc.city && listingLoc.city.toLowerCase() === userCity.toLowerCase());
      if (sameCountry) score += 2;
      if (sameCity) score += 3;
      const distanceKm = userGeo && listingGeo ? haversineDistanceKm(userGeo, listingGeo) : undefined;
      if (distanceKm !== undefined) {
        if (distanceKm <= 5) score += 5;
        else if (distanceKm <= 20) score += 4;
        else if (distanceKm <= 50) score += 3;
        else if (distanceKm <= 100) score += 2;
        else if (distanceKm <= 250) score += 1;
      }
      const ts = l.createdAt && typeof (l.createdAt as any).toDate === 'function' ? (l.createdAt as any).toDate() : (l.createdAt ? new Date(l.createdAt) : new Date());
      const ageDays = Math.max(0, (Date.now() - ts.getTime()) / (1000 * 60 * 60 * 24));
      score += Math.max(0, 3 - Math.floor(ageDays));
      return { l, score, sameCity, sameCountry, distanceKm };
    }).sort((a, b) => {
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== undefined && b.distanceKm === undefined) return -1;
      if (a.distanceKm === undefined && b.distanceKm !== undefined) return 1;
      if (a.sameCity !== b.sameCity) return a.sameCity ? -1 : 1;
      if (a.sameCountry !== b.sameCountry) return a.sameCountry ? -1 : 1;
      return b.score - a.score;
    }).slice(0, 12).map(x => x.l);

    return { recommendations: scored };
  }

  async cycles3(uid: string) {
    const userDoc = await this.getVerifiedUser(uid);
    const udata: any = userDoc.data() || {};
    const userLoc = this.readLocationMeta(udata);
    const userCountry = userLoc.country;
    const userCity = userLoc.city;
    let userGeo = this.readUserGeo(udata);
    if (!userGeo) {
      const query = [udata.location, userLoc.city, userLoc.country].filter(Boolean).join(', ');
      const geocoded = query ? await geocodeAddress(query) : null;
      userGeo = geocoded?.point;
    }

    const snap = await this.fetchPendingRequests(500);

    type Edge = { from: string; to: string; requestId: string; listingId: string; createdAt: number };
    const edgesByFrom = new Map<string, Edge[]>();
    const edgesKeyed = new Map<string, Edge>();
    const listingIds = new Set<string>();
    const userIds = new Set<string>();
    const edges: Edge[] = [];

    for (const d of snap.docs) {
      const data = d.data() as any;
      const from = String(data.requesterId || '');
      const to = String(data.ownerId || '');
      const listingId = String(data.listingId || '');
      if (!from || !to || !listingId) continue;
      const ts = data.createdAt && typeof (data.createdAt as any).toDate === 'function'
        ? (data.createdAt as any).toDate().getTime()
        : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
      const e: Edge = { from, to, requestId: d.id, listingId, createdAt: ts };
      edges.push(e);
      listingIds.add(listingId);
      userIds.add(from); userIds.add(to);
      if (!edgesByFrom.has(from)) edgesByFrom.set(from, []);
      edgesByFrom.get(from)!.push(e);
      edgesKeyed.set(`${from}|${to}`, e);
    }

    const listingDocs = await Promise.all(Array.from(listingIds).map(id => admin.firestore().collection('listings').doc(id).get()));
    const isListingFulfilled = new Map<string, boolean>();
    for (const doc of listingDocs) {
      const ld = (doc.data() as any) || {};
      const status = String(ld.status || '').toLowerCase();
      isListingFulfilled.set(doc.id, status === 'fulfilled' || Boolean(ld.flagged));
    }

    const seen = new Set<string>();
    const cycles: Array<{ users: [string, string, string]; edges: [Edge, Edge, Edge] }> = [];

    for (const e1 of edges) {
      if (isListingFulfilled.get(e1.listingId)) continue;
      const a = e1.from; const b = e1.to;
      const outB = edgesByFrom.get(b);
      if (!outB) continue;
      for (const e2 of outB) {
        if (isListingFulfilled.get(e2.listingId)) continue;
        const c = e2.to;
        if (c === a || c === b) continue;
        const e3 = edgesKeyed.get(`${c}|${a}`);
        if (!e3) continue;
        if (isListingFulfilled.get(e3.listingId)) continue;
        const trio: [string, string, string] = [a, b, c];
        const rotations = [trio, [b, c, a] as [string,string,string], [c, a, b] as [string,string,string]];
        const canonical = rotations.map(r => r.join('|')).sort()[0];
        if (seen.has(canonical)) continue;
        seen.add(canonical);
        cycles.push({ users: [a, b, c], edges: [e1, e2, e3] });
      }
    }

    const userDocs = await Promise.all(Array.from(userIds).map(id => admin.firestore().collection('users').doc(id).get()));
    const usersMap = new Map<string, any>();
    for (const doc of userDocs) {
      const ud = (doc.data() as any) || {};
      usersMap.set(doc.id, ud);
    }

    const getCityCountry = (u: string): { city: string; country: string } => this.readLocationMeta(usersMap.get(u) || {});
    const getGeo = (u: string): GeoPoint | undefined => this.readUserGeo(usersMap.get(u) || {});

    const latestListingTs = new Map<string, number>();
    const listingSummary = new Map<string, { id: string; title?: string; category?: string }>();
    const listingGeo = new Map<string, GeoPoint>();
    for (const doc of listingDocs) {
      const ld: any = (doc.data() as any) || {};
      const ts = ld.createdAt && typeof (ld.createdAt as any).toDate === 'function'
        ? (ld.createdAt as any).toDate().getTime()
        : (ld.createdAt ? new Date(ld.createdAt).getTime() : 0);
      latestListingTs.set(doc.id, ts);
      const geo = this.readListingGeo(ld);
      if (geo) listingGeo.set(doc.id, geo);
      const title = ld.title || ld.name || ld.offeredService?.title || ld.offeredService?.name || ld.category;
      const category = ld.category || ld.offeredService?.category;
      listingSummary.set(doc.id, { id: doc.id, title, category });
    }

    const sorted = cycles.map(c => {
      const [a, b, cc] = c.users;
      const locs = [getCityCountry(a), getCityCountry(b), getCityCountry(cc)];
      const cityMatch = userCity ? locs.some(l => l.city && l.city.toLowerCase() === userCity.toLowerCase()) : false;
      const countryMatch = userCountry ? locs.some(l => l.country && l.country.toLowerCase() === userCountry.toLowerCase()) : false;
      const otherUsers = c.users.filter((u) => u !== uid);
      const distances = userGeo
        ? otherUsers.map((u) => {
            const g = getGeo(u);
            return g ? haversineDistanceKm(userGeo, g) : undefined;
          }).filter((d): d is number => d !== undefined)
        : [];
      const listingDistances = userGeo
        ? c.edges.map((e) => {
            const g = listingGeo.get(e.listingId);
            return g ? haversineDistanceKm(userGeo, g) : undefined;
          }).filter((d): d is number => d !== undefined)
        : [];
      const distanceKm = distances.length
        ? Math.min(...distances)
        : listingDistances.length
          ? Math.min(...listingDistances)
          : undefined;
      const latestReqTs = Math.max(c.edges[0].createdAt, c.edges[1].createdAt, c.edges[2].createdAt);
      const latestListTs = Math.max(
        latestListingTs.get(c.edges[0].listingId) || 0,
        latestListingTs.get(c.edges[1].listingId) || 0,
        latestListingTs.get(c.edges[2].listingId) || 0,
      );
      const latestTs = Math.max(latestReqTs, latestListTs);
      const idx = c.users.findIndex(u => u === uid);
      let willGetId: string | undefined;
      let willGiveId: string | undefined;
      if (idx === 0) { willGetId = c.edges[0].listingId; willGiveId = c.edges[2].listingId; }
      else if (idx === 1) { willGetId = c.edges[1].listingId; willGiveId = c.edges[0].listingId; }
      else if (idx === 2) { willGetId = c.edges[2].listingId; willGiveId = c.edges[1].listingId; }
      const perspective = {
        willGet: willGetId ? listingSummary.get(willGetId) : undefined,
        willGive: willGiveId ? listingSummary.get(willGiveId) : undefined,
      };
      const participants = c.users.map(u => ({ uid: u, name: (usersMap.get(u) || {}).name || (usersMap.get(u) || {}).displayName }));
      return { c, cityMatch, countryMatch, distanceKm, latestTs, perspective, participants };
    }).sort((x, y) => {
      if (x.distanceKm !== undefined && y.distanceKm !== undefined) return x.distanceKm - y.distanceKm;
      if (x.distanceKm !== undefined && y.distanceKm === undefined) return -1;
      if (x.distanceKm === undefined && y.distanceKm !== undefined) return 1;
      if (x.cityMatch !== y.cityMatch) return x.cityMatch ? -1 : 1;
      if (x.countryMatch !== y.countryMatch) return x.countryMatch ? -1 : 1;
      return y.latestTs - x.latestTs;
    }).map(x => ({
      users: x.c.users,
      edges: x.c.edges,
      participants: x.participants,
      perspective: x.perspective,
      type: 'triad' as const,
    }));

    return { cycles: sorted };
  }

  async mutual2(uid: string) {
    const userDoc = await this.getVerifiedUser(uid);
    const udata: any = userDoc.data() || {};
    const userLoc = this.readLocationMeta(udata);
    const userCountry = userLoc.country;
    const userCity = userLoc.city;
    let userGeo = this.readUserGeo(udata);
    if (!userGeo) {
      const query = [udata.location, userLoc.city, userLoc.country].filter(Boolean).join(', ');
      const geocoded = query ? await geocodeAddress(query) : null;
      userGeo = geocoded?.point;
    }

    const snap = await this.fetchPendingRequests(500);

    type Edge = { from: string; to: string; requestId: string; listingId: string; createdAt: number };
    const edgesKeyed = new Map<string, Edge>();
    const listingIds = new Set<string>();
    const userIds = new Set<string>();

    for (const d of snap.docs) {
      const data = d.data() as any;
      const from = String(data.requesterId || '');
      const to = String(data.ownerId || '');
      const listingId = String(data.listingId || '');
      if (!from || !to || !listingId) continue;
      const ts = data.createdAt && typeof (data.createdAt as any).toDate === 'function'
        ? (data.createdAt as any).toDate().getTime()
        : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
      const e: Edge = { from, to, requestId: d.id, listingId, createdAt: ts };
      listingIds.add(listingId);
      userIds.add(from); userIds.add(to);
      const key = `${from}|${to}`;
      const existing = edgesKeyed.get(key);
      if (!existing || existing.createdAt < e.createdAt) edgesKeyed.set(key, e);
    }

    const listingDocs = await Promise.all(Array.from(listingIds).map(id => admin.firestore().collection('listings').doc(id).get()));
    const isListingFulfilled = new Map<string, boolean>();
    const listingTs = new Map<string, number>();
    const listingSummary = new Map<string, { id: string; title?: string; category?: string }>();
    const listingGeo = new Map<string, GeoPoint>();
    for (const doc of listingDocs) {
      const ld = (doc.data() as any) || {};
      const status = String(ld.status || '').toLowerCase();
      isListingFulfilled.set(doc.id, status === 'fulfilled' || Boolean(ld.flagged));
      const ts = ld.createdAt && typeof (ld.createdAt as any).toDate === 'function'
        ? (ld.createdAt as any).toDate().getTime()
        : (ld.createdAt ? new Date(ld.createdAt).getTime() : 0);
      listingTs.set(doc.id, ts);
      const geo = this.readListingGeo(ld);
      if (geo) listingGeo.set(doc.id, geo);
      const title = ld.title || ld.name || ld.offeredService?.title || ld.offeredService?.name || ld.category;
      const category = ld.category || ld.offeredService?.category;
      listingSummary.set(doc.id, { id: doc.id, title, category });
    }

    const seen = new Set<string>();
    const pairs: Array<{ users: [string, string]; edges: [Edge, Edge] }> = [];
    for (const [key, e1] of edgesKeyed.entries()) {
      const [a, b] = key.split('|');
      const rev = edgesKeyed.get(`${b}|${a}`);
      if (!rev) continue;
      if (isListingFulfilled.get(e1.listingId) || isListingFulfilled.get(rev.listingId)) continue;
      const canonical = [a, b].sort().join('|');
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      pairs.push({ users: [a, b], edges: [e1, rev] });
    }

    const userDocs = await Promise.all(Array.from(userIds).map(id => admin.firestore().collection('users').doc(id).get()));
    const usersMap = new Map<string, any>();
    for (const doc of userDocs) usersMap.set(doc.id, (doc.data() as any) || {});
    const getCityCountry = (u: string) => this.readLocationMeta(usersMap.get(u) || {});
    const getGeo = (u: string): GeoPoint | undefined => this.readUserGeo(usersMap.get(u) || {});

    const sorted = pairs.map(p => {
      const [a, b] = p.users;
      const locs = [getCityCountry(a), getCityCountry(b)];
      const cityMatch = userCity ? locs.some(l => l.city && l.city.toLowerCase() === userCity.toLowerCase()) : false;
      const countryMatch = userCountry ? locs.some(l => l.country && l.country.toLowerCase() === userCountry.toLowerCase()) : false;
      const otherId = a === uid ? b : a;
      const otherGeo = getGeo(otherId);
      const pairListingGeos = [listingGeo.get(p.edges[0].listingId), listingGeo.get(p.edges[1].listingId)].filter((g): g is GeoPoint => Boolean(g));
      const listingDistanceKm = userGeo && pairListingGeos.length
        ? Math.min(...pairListingGeos.map((g) => haversineDistanceKm(userGeo!, g)))
        : undefined;
      const distanceKm = userGeo && otherGeo ? haversineDistanceKm(userGeo, otherGeo) : listingDistanceKm;
      const latestReqTs = Math.max(p.edges[0].createdAt, p.edges[1].createdAt);
      const latestListTs = Math.max(listingTs.get(p.edges[0].listingId) || 0, listingTs.get(p.edges[1].listingId) || 0);
      const latestTs = Math.max(latestReqTs, latestListTs);
      const idx = p.users.findIndex(u => u === uid);
      let willGetId: string | undefined;
      let willGiveId: string | undefined;
      if (idx === 0) { willGetId = p.edges[0].listingId; willGiveId = p.edges[1].listingId; }
      else if (idx === 1) { willGetId = p.edges[1].listingId; willGiveId = p.edges[0].listingId; }
      const perspective = {
        willGet: willGetId ? listingSummary.get(willGetId) : undefined,
        willGive: willGiveId ? listingSummary.get(willGiveId) : undefined,
      };
      const participants = p.users.map(u => ({ uid: u, name: (usersMap.get(u) || {}).name || (usersMap.get(u) || {}).displayName }));
      return { p, cityMatch, countryMatch, distanceKm, latestTs, perspective, participants };
    }).sort((x, y) => {
      if (x.distanceKm !== undefined && y.distanceKm !== undefined) return x.distanceKm - y.distanceKm;
      if (x.distanceKm !== undefined && y.distanceKm === undefined) return -1;
      if (x.distanceKm === undefined && y.distanceKm !== undefined) return 1;
      if (x.cityMatch !== y.cityMatch) return x.cityMatch ? -1 : 1;
      if (x.countryMatch !== y.countryMatch) return x.countryMatch ? -1 : 1;
      return y.latestTs - x.latestTs;
    }).map(x => ({
      users: x.p.users,
      edges: x.p.edges,
      participants: x.participants,
      perspective: x.perspective,
      type: 'mutual' as const,
    }));

    return { pairs: sorted };
  }

  /**
   * Listing-based complementary matching.
   * Finds listings by other users where:
   *   - they offer what I want (their offeredService.category === my requestedService.category)
   *   - they want what I offer (their requestedService.category === my offeredService.category)
   * This fires without either party needing to send a request first.
   */
  async listingMatches(uid: string) {
    // No KYC required — browsing complementary listings is read-only discovery.
    // 1. Get my active listings
    const myListingsSnap = await admin.firestore().collection('listings')
      .where('userId', '==', uid)
      .limit(10)
      .get();

    if (myListingsSnap.empty) return { matches: [] };

    const myListings = myListingsSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(l => !l.flagged && String(l.status || '').toLowerCase() !== 'fulfilled');

    if (!myListings.length) return { matches: [] };

    // 2. Build offer/want category sets for my listings
    const myOfferCategories = new Set<string>();
    const myWantCategories = new Set<string>();
    const myListingByOfferCat = new Map<string, any>();

    for (const l of myListings) {
      const offerCat = String(l.offeredService?.category || l.category || '').toLowerCase().trim();
      const wantCat = String(l.requestedService?.category || l.requestedCategory || '').toLowerCase().trim();
      if (offerCat) {
        myOfferCategories.add(offerCat);
        myListingByOfferCat.set(offerCat, l);
      }
      if (wantCat) myWantCategories.add(wantCat);
    }

    if (!myWantCategories.size || !myOfferCategories.size) return { matches: [] };

    // 3. Fetch recent other users' active listings
    const othersSnap = await admin.firestore().collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const candidates = othersSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(l => {
        const owner = l.userId || l.offeredByUserId || l.ownerId;
        return owner && owner !== uid && !l.flagged && String(l.status || '').toLowerCase() !== 'fulfilled';
      });

    // 4. Cross-match: their offer == my want AND their want == my offer
    const results: Array<{
      myListingId: string;
      myListingTitle: string;
      theirListingId: string;
      theirListing: {
        id: string;
        title?: string;
        category?: string;
        requestedCategory?: string;
        location?: string;
        userId?: string;
      };
    }> = [];
    const seen = new Set<string>();

    for (const theirs of candidates) {
      const theirOffer = String(theirs.offeredService?.category || theirs.category || '').toLowerCase().trim();
      const theirWant = String(theirs.requestedService?.category || theirs.requestedCategory || '').toLowerCase().trim();

      if (!theirOffer || !theirWant) continue;

      // They offer what I want
      if (!myWantCategories.has(theirOffer)) continue;

      // They want what I offer
      const myMatchingListing = myListingByOfferCat.get(theirWant);
      if (!myMatchingListing) continue;

      const pairKey = `${myMatchingListing.id}|${theirs.id}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      results.push({
        myListingId: myMatchingListing.id,
        myListingTitle: myMatchingListing.offeredService?.title || myMatchingListing.title || 'My listing',
        theirListingId: theirs.id,
        theirListing: {
          id: theirs.id,
          title: theirs.offeredService?.title || theirs.title,
          category: theirs.offeredService?.category || theirs.category,
          requestedCategory: theirs.requestedService?.category || theirs.requestedCategory,
          location: theirs.location,
          userId: theirs.userId || theirs.offeredByUserId || theirs.ownerId,
        },
      });

      if (results.length >= 20) break;
    }

    // 5. Enrich with user names
    const userIds = Array.from(new Set(results.map(r => r.theirListing.userId).filter(Boolean))) as string[];
    const userDocs = await Promise.all(userIds.map(id => admin.firestore().collection('users').doc(id).get()));
    const usersMap = new Map<string, any>();
    for (const doc of userDocs) usersMap.set(doc.id, (doc.data() as any) || {});

    const enriched = results.map(r => {
      const uData = r.theirListing.userId ? (usersMap.get(r.theirListing.userId) || {}) : {};
      return {
        ...r,
        participant: r.theirListing.userId ? {
          uid: r.theirListing.userId,
          name: uData.name || uData.displayName || uData.fullName || null,
          photoURL: uData.photoURL || uData.avatarUrl || uData.profileImage || null,
        } : undefined,
      };
    });

    return { matches: enriched };
  }

  async accept(uid: string, body: any) {
    await this.getVerifiedUser(uid);
    const { type, users, edges } = body || {};
    if (type !== 'triad' && type !== 'mutual') throw new BadRequestException('invalid_type');
    if (!Array.isArray(users)) throw new BadRequestException('invalid_users');
    if ((type === 'triad' && users.length !== 3) || (type === 'mutual' && users.length !== 2)) {
      throw new BadRequestException('invalid_users_length');
    }
    if (!Array.isArray(edges) || edges.length !== (type === 'triad' ? 3 : 2)) {
      throw new BadRequestException('invalid_edges');
    }

    function canonicalKeyTriad(u: string[]): string {
      const [a, b, c] = u as [string, string, string];
      const rotations = [ [a,b,c], [b,c,a], [c,a,b] ].map(r => r.join('|'));
      const canon = rotations.sort()[0];
      return `triad:${canon}`;
    }
    function canonicalKeyMutual(u: string[]): string {
      const s = [...u].sort().join('|');
      return `mutual:${s}`;
    }

    const key = type === 'triad' ? canonicalKeyTriad(users) : canonicalKeyMutual(users);
    let willGiveListingId: string | undefined;
    if (type === 'triad') {
      const idx = users.findIndex((u: string) => u === uid);
      if (idx === -1) throw new ForbiddenException('user_not_in_match');
      if (idx === 0) willGiveListingId = String(edges[2]?.listingId || '');
      else if (idx === 1) willGiveListingId = String(edges[0]?.listingId || '');
      else if (idx === 2) willGiveListingId = String(edges[1]?.listingId || '');
    } else {
      const e = edges.find((e: any) => String(e.to || '') === uid);
      willGiveListingId = e ? String(e.listingId || '') : '';
    }
    if (!willGiveListingId) throw new BadRequestException('cannot_determine_role');

    const acceptRef = admin.firestore().collection('matchAcceptances').doc(key);
    const lockRef = admin.firestore().collection('matchLocks').doc(willGiveListingId);
    const fv: any = (admin.firestore as any)?.FieldValue;
    const now = fv && typeof fv.serverTimestamp === 'function'
      ? fv.serverTimestamp()
      : new Date();

    await admin.firestore().runTransaction(async (tx) => {
      const lockDoc = await tx.get(lockRef);
      if (lockDoc.exists) {
        const ld = lockDoc.data() as any;
        if (ld.matchKey && ld.matchKey !== key) {
          throw new functions.https.HttpsError('already-exists', 'service_already_locked');
        }
        if (ld.lockedBy && ld.lockedBy !== uid) {
          throw new functions.https.HttpsError('already-exists', 'service_locked_by_other');
        }
      }
      const curr = await tx.get(acceptRef);
      const existing: any = curr.exists ? (curr.data() as any) : {};
      const acceptedBy: string[] = Array.isArray(existing.acceptedBy) ? existing.acceptedBy : [];
      const roles: Record<string, string> = existing.roles || {};
      const reserved: Record<string, string> = existing.reservedListings || {};
      roles[uid] = willGiveListingId!;
      reserved[willGiveListingId!] = uid;
      const newAccepted = Array.from(new Set([...(acceptedBy || []), uid]));
      tx.set(acceptRef, {
        type,
        users,
        edges,
        acceptedBy: newAccepted,
        roles,
        reservedListings: reserved,
        updatedAt: now,
        createdAt: existing.createdAt || now,
      }, { merge: true } as any);
      tx.set(lockRef, { matchKey: key, lockedBy: uid, type, users, updatedAt: now, createdAt: lockDoc.exists ? (lockDoc.data() as any).createdAt || now : now }, { merge: true } as any);
    });

    const listIds = Array.from(new Set((edges as any[]).map(e => String(e.listingId || ''))));
    const listingDocs = await Promise.all(listIds.map(id => admin.firestore().collection('listings').doc(id).get()));
    const listingTitle = (id: string) => {
      const doc = listingDocs.find(d => d.id === id);
      const ld: any = doc?.data() || {};
      return ld.title || ld.name || ld.offeredService?.title || ld.offeredService?.name || ld.category || 'Service';
    };
    const userDocs = await Promise.all(users.map((id: string) => admin.firestore().collection('users').doc(id).get()));
    const userName = (id: string) => {
      const ud: any = userDocs.find(d => d.id === id)?.data() || {};
      return ud.name || ud.displayName || 'User';
    };

    const accSnap = await acceptRef.get();
    const acc: any = accSnap.data() || {};
    const acceptedBy: string[] = acc.acceptedBy || [];
    const reservedListings: Record<string, string> = acc.reservedListings || {};

    const waitingId = listIds.find(id => !reservedListings[id]);
    const waitingName = waitingId ? listingTitle(waitingId) : undefined;
    const myServiceName = listingTitle(willGiveListingId);
    const myName = userName(uid);

    for (const p of users as string[]) {
      if (p === uid) continue;
      await sendInAppNotification({
        userId: p,
        type: 'system',
        content: `Your matchmaking for service ${myServiceName} has been accepted by ${myName}${waitingName ? `. Waiting for service ${waitingName}` : ''}.`,
      } as any);
    }

    const allAccepted = acceptedBy.length >= (users as string[]).length && (Object.keys(reservedListings).length >= (users as string[]).length);
    if (allAccepted) {
      const db = admin.database();
      const convRef = db.ref('conversations').push();
      const convId = convRef.key as string;
      const participants: Record<string, boolean> = {};
      for (const u of users as string[]) participants[u] = true;
      const convoTitle = `${listingTitle(listIds[0])} Exchange`;
      await convRef.set({ participants, title: convoTitle, lastMessage: 'Matchmaking confirmed. Start planning here!', lastMessageAt: Date.now() });
      const msgRef = db.ref(`conversations/${convId}/messages`).push();
      await msgRef.set({ senderId: 'system', text: 'Matchmaking confirmed. Start planning here!', createdAt: Date.now() });
      for (const u of users as string[]) {
        await db.ref(`userConversations/${u}/${convId}`).set(true);
        await sendInAppNotification({ userId: u, type: 'system', content: 'All participants accepted. A group chat has been created.' } as any);
      }
      await acceptRef.set({ conversationId: convId, conversationTitle: convoTitle, conversationCreatedAt: now }, { merge: true } as any);
    }

    return { ok: true, key, acceptedCount: (acceptedBy || []).length };
  }

  private readLocationMeta(data: any): { city: string; country: string } {
    const raw = data || {};
    const rawLocationText = typeof raw.location === 'string' ? raw.location : '';
    const parts = rawLocationText.split(',').map((v: string) => String(v || '').trim()).filter(Boolean);
    const guessedCity = parts.length ? parts[0] : '';
    const guessedCountry = rawLocationText.includes(',')
      ? parts.slice(-1)[0] || ''
      : '';
    const city = String(raw.city || raw.locationMeta?.city || raw.location?.city || guessedCity || rawLocationText || '').trim();
    const country = String(raw.country || raw.locationMeta?.country || raw.location?.country || guessedCountry || '').trim();
    return { city, country };
  }

  private readUserGeo(data: any): GeoPoint | undefined {
    const raw = data || {};
    return readGeoPoint(raw.geo || raw.locationGeo || undefined);
  }

  private readListingGeo(data: any): GeoPoint | undefined {
    const raw = data || {};
    return readGeoPoint(raw.geo || raw.locationGeo || undefined);
  }

  private ensureKycVerified(userSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    const status = String(userSnap.get('kyc.status') || userSnap.get('kyc')?.status || '').toUpperCase();
    if (status !== 'VERIFIED') {
      throw new ForbiddenException('KYC verification required');
    }
  }

  private async getVerifiedUser(uid: string) {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new BadRequestException('User not found');
    }
    this.ensureKycVerified(userDoc);
    return userDoc;
  }

  private async fetchPendingRequests(limit: number) {
    const requestsRef = admin.firestore().collection('requests');
    try {
      return await requestsRef
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    } catch (err: any) {
      if (this.isFirestoreIndexError(err)) {
        this.logger.warn('[matchmaking] Falling back to non-indexed pending requests query.');
        return requestsRef
          .where('status', '==', 'pending')
          .limit(limit)
          .get();
      }
      throw err;
    }
  }

  private isFirestoreIndexError(err: any): boolean {
    const message = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toLowerCase();
    return (
      code === 'failed-precondition'
      || code === '9'
      || message.includes('requires an index')
      || message.includes('failed precondition')
    );
  }
}
