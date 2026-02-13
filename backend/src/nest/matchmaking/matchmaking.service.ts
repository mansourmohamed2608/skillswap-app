import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sendInAppNotification } from '../../core/notifications';

@Injectable()
export class MatchmakingService {
  async recommendations(uid: string) {
    const userDoc = await this.getVerifiedUser(uid);
    const udata: any = userDoc.data() || {};
    const userCountry = udata.country || udata.location?.country || '';
    const userCity = udata.city || udata.location?.city || '';

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
      const loc = l.location || '';
      if (prefCategory && cat && cat.toLowerCase() === prefCategory.toLowerCase()) score += 3;
      if (userCountry && typeof loc === 'string' && loc.toLowerCase().includes(userCountry.toLowerCase())) score += 2;
      if (userCity && typeof loc === 'string' && loc.toLowerCase().includes(userCity.toLowerCase())) score += 1;
      const ts = l.createdAt && typeof (l.createdAt as any).toDate === 'function' ? (l.createdAt as any).toDate() : (l.createdAt ? new Date(l.createdAt) : new Date());
      const ageDays = Math.max(0, (Date.now() - ts.getTime()) / (1000 * 60 * 60 * 24));
      score += Math.max(0, 3 - Math.floor(ageDays));
      return { l, score };
    }).sort((a, b) => b.score - a.score).slice(0, 12).map(x => x.l);

    return { recommendations: scored };
  }

  async cycles3(uid: string) {
    const userDoc = await this.getVerifiedUser(uid);
    const udata: any = userDoc.data() || {};
    const userCountry = (udata.country || udata.location?.country || '').toString();
    const userCity = (udata.city || udata.location?.city || '').toString();

    const snap = await admin.firestore().collection('requests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

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

    function getCityCountry(u: string): { city: string; country: string } {
      const d = usersMap.get(u) || {};
      return {
        city: (d.city || d.location?.city || '').toString(),
        country: (d.country || d.location?.country || '').toString(),
      };
    }

    const latestListingTs = new Map<string, number>();
    const listingSummary = new Map<string, { id: string; title?: string; category?: string }>();
    for (const doc of listingDocs) {
      const ld: any = (doc.data() as any) || {};
      const ts = ld.createdAt && typeof (ld.createdAt as any).toDate === 'function'
        ? (ld.createdAt as any).toDate().getTime()
        : (ld.createdAt ? new Date(ld.createdAt).getTime() : 0);
      latestListingTs.set(doc.id, ts);
      const title = ld.title || ld.name || ld.offeredService?.title || ld.offeredService?.name || ld.category;
      const category = ld.category || ld.offeredService?.category;
      listingSummary.set(doc.id, { id: doc.id, title, category });
    }

    const sorted = cycles.map(c => {
      const [a, b, cc] = c.users;
      const locs = [getCityCountry(a), getCityCountry(b), getCityCountry(cc)];
      const cityMatch = userCity ? locs.some(l => l.city && l.city.toLowerCase() === userCity.toLowerCase()) : false;
      const countryMatch = userCountry ? locs.some(l => l.country && l.country.toLowerCase() === userCountry.toLowerCase()) : false;
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
      return { c, cityMatch, countryMatch, latestTs, perspective, participants };
    }).sort((x, y) => {
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
    const userCountry = (udata.country || udata.location?.country || '').toString();
    const userCity = (udata.city || udata.location?.city || '').toString();

    const snap = await admin.firestore().collection('requests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

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
    for (const doc of listingDocs) {
      const ld = (doc.data() as any) || {};
      const status = String(ld.status || '').toLowerCase();
      isListingFulfilled.set(doc.id, status === 'fulfilled' || Boolean(ld.flagged));
      const ts = ld.createdAt && typeof (ld.createdAt as any).toDate === 'function'
        ? (ld.createdAt as any).toDate().getTime()
        : (ld.createdAt ? new Date(ld.createdAt).getTime() : 0);
      listingTs.set(doc.id, ts);
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
    const getCityCountry = (u: string) => ({
      city: ((usersMap.get(u) || {}).city || (usersMap.get(u) || {}).location?.city || '').toString(),
      country: ((usersMap.get(u) || {}).country || (usersMap.get(u) || {}).location?.country || '').toString(),
    });

    const sorted = pairs.map(p => {
      const [a, b] = p.users;
      const locs = [getCityCountry(a), getCityCountry(b)];
      const cityMatch = userCity ? locs.some(l => l.city && l.city.toLowerCase() === userCity.toLowerCase()) : false;
      const countryMatch = userCountry ? locs.some(l => l.country && l.country.toLowerCase() === userCountry.toLowerCase()) : false;
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
      return { p, cityMatch, countryMatch, latestTs, perspective, participants };
    }).sort((x, y) => {
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
}
