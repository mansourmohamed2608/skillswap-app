import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { logger } from './core/logger';

function getAlgoliaClient() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const algoliasearch = require('algoliasearch');
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_API_KEY;
    const indexName = process.env.ALGOLIA_INDEX || 'listings';
    if (!appId || !apiKey) return null;
    const client = algoliasearch(appId, apiKey);
    const index = client.initIndex(indexName);
    return { client, index };
  } catch (e) {
    logger.warn({ err: e }, 'Algolia client not available (dependency missing or config unset). Skipping indexing.');
    return null;
  }
}

export const onListingWrite = onDocumentWritten('listings/{id}', async (event) => {
    const change = event.data;
    if (!change) return;
    const algolia = getAlgoliaClient();
    if (!algolia) {
      return;
    }
    const { index } = algolia;

    // Deleted
    if (!change.after.exists) {
      const objectID = event.params.id as string;
      try {
        await index.deleteObject(objectID);
      } catch (e) {
        logger.warn({ err: e }, 'Algolia delete failed');
      }
      return;
    }

    // Created or updated
    const snap = change.after;
    const data = snap.data() || {} as any;
    const lat = Number((data.geo && data.geo.lat) ?? NaN);
    const lng = Number((data.geo && data.geo.lng) ?? NaN);
    const requestedKind = String(data.requestedKind || 'service').toLowerCase();
    const object = {
      objectID: snap.id,
      title: data.title || data.offeredService?.title || '',
      description: data.description || data.offeredService?.description || '',
      category: data.category || data.offeredService?.category || '',
      requestedKind,
      requestedProduct: data.requestedProduct || null,
      requestedMoney: data.requestedMoney || null,
      requestedMoneyAmount: data.requestedMoney?.amount ?? null,
      requestedMoneyCurrency: data.requestedMoney?.currency ?? '',
      requestedProductName: data.requestedProduct?.name ?? '',
      location: data.location || '',
      status: data.status || 'open',
      createdAt: (data.createdAt && typeof (data.createdAt as any).toDate === 'function')
        ? (data.createdAt as any).toDate().toISOString()
        : (data.createdAt || new Date()).toString(),
      userId: data.userId || data.offeredByUserId || '',
      ...(Number.isFinite(lat) && Number.isFinite(lng) ? { _geoloc: { lat, lng } } : {}),
    };
    try {
      await index.saveObject(object);
    } catch (e) {
      logger.warn({ err: e }, 'Algolia save failed');
    }
  });
