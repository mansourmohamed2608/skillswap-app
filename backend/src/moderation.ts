import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { ensureAdminApp } from './core/firebase-admin';
import { checkImageModeration, findBannedKeyword } from './core/moderation-utils';


/**
 * Cloud Function triggered whenever a new listing document is created.
 * It inspects the listing's title and description for banned keywords and
 * marks the listing as flagged if any are found.  A flagReason field is
 * added to aid moderation workflows.  This function executes on the
 * server side and cannot be bypassed by the client.
 */
export const moderateListing = onDocumentCreated('listings/{listingId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    ensureAdminApp();
    const data = snapshot.data() as { title?: string; description?: string };
    const text = `${data.title ?? ''} ${data.description ?? ''}`.toLowerCase();
    const found = await findBannedKeyword(text);
    const imageUrl = (snapshot.data() as any)?.imageUrl || (snapshot.data() as any)?.offeredService?.imageUrl || null;
    const imageCheck = await checkImageModeration(imageUrl);
    const flaggedReason = found ? `Contains banned keyword: ${found}` : (imageCheck.ok ? null : `Flagged image: ${imageCheck.reason}`);
    if (flaggedReason) {
      await snapshot.ref.update({
        flagged: true,
        flagReason: flaggedReason,
      });
      // optional: create a moderation notification document
      // When FieldValue.serverTimestamp() is unavailable (Node 22), use a client timestamp.
      const createdAtVal =
        (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
          ? (admin.firestore.FieldValue as any).serverTimestamp()
          : new Date();
      await admin.firestore().collection('moderationFlags').add({
        type: 'listing',
        contentId: snapshot.id,
        listingId: snapshot.id,
        ownerId: (snapshot.data() as any)?.userId || (snapshot.data() as any)?.offeredByUserId || null,
        keyword: found || imageCheck.reason || null,
        reason: flaggedReason,
        createdAt: createdAtVal,
      });
    }
    return null;
  });

/**
 * Similar moderation for wishes: flag content that matches banned keywords.
 */
export const moderateWish = onDocumentCreated('wishes/{wishId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    ensureAdminApp();
    const data = snapshot.data() as { title?: string; description?: string; details?: string };
    const text = `${data.title ?? ''} ${data.description ?? ''} ${data.details ?? ''}`.toLowerCase();
    const found = await findBannedKeyword(text);
    const imageUrl = (snapshot.data() as any)?.imageUrl || null;
    const imageCheck = await checkImageModeration(imageUrl);
    const flaggedReason = found ? `Contains banned keyword: ${found}` : (imageCheck.ok ? null : `Flagged image: ${imageCheck.reason}`);
    if (flaggedReason) {
      await snapshot.ref.update({
        flagged: true,
        flagReason: flaggedReason,
      });
      const createdAtVal =
        (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
          ? (admin.firestore.FieldValue as any).serverTimestamp()
          : new Date();
      await admin.firestore().collection('moderationFlags').add({
        type: 'wish',
        contentId: snapshot.id,
        wishId: snapshot.id,
        ownerId: (snapshot.data() as any)?.userId || null,
        keyword: found || imageCheck.reason || null,
        reason: flaggedReason,
        createdAt: createdAtVal,
      });
    }
    return null;
  });

/**
 * Moderation for reviews: flag content that matches banned keywords.
 */
export const moderateReview = onDocumentCreated('reviews/{reviewId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    ensureAdminApp();
    const data = snapshot.data() as { comment?: string };
    const text = `${data.comment ?? ''}`.toLowerCase();
    const found = await findBannedKeyword(text);
    if (found) {
      await snapshot.ref.update({
        flagged: true,
        flagReason: `Contains banned keyword: ${found}`,
        status: 'flagged',
        counted: false,
      });
      const createdAtVal =
        (admin.firestore.FieldValue && (admin.firestore.FieldValue as any).serverTimestamp)
          ? (admin.firestore.FieldValue as any).serverTimestamp()
          : new Date();
      await admin.firestore().collection('moderationFlags').add({
        type: 'review',
        contentId: snapshot.id,
        reviewId: snapshot.id,
        ownerId: (snapshot.data() as any)?.ownerId || null,
        keyword: found,
        reason: `Contains banned keyword: ${found}`,
        createdAt: createdAtVal,
      });
    }
    return null;
  });
