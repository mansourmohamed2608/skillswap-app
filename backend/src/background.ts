// Background functions (Firestore triggers) exported separately to avoid
// Firebase discovery timeout. These don't require NestJS initialization and load quickly.
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-west3' });

export { moderateListing } from './moderation';
export { moderateWish } from './moderation';
export { moderateReview } from './moderation';
export { onListingWrite } from './search';
export { syncPublicProfile } from './public-profiles';
