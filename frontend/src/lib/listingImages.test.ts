import { describe, expect, it } from 'vitest';
import { MAX_LISTING_IMAGE_BYTES, validateListingImage } from './listingImages';

describe('validateListingImage', () => {
  it('accepts a supported image within the upload limit', () => {
    expect(validateListingImage({ size: MAX_LISTING_IMAGE_BYTES, type: 'image/webp' })).toBe('VALID');
  });

  it('rejects oversized and non-image uploads', () => {
    expect(validateListingImage({ size: MAX_LISTING_IMAGE_BYTES + 1, type: 'image/jpeg' })).toBe('FILE_TOO_LARGE');
    expect(validateListingImage({ size: 10, type: 'text/html' })).toBe('INVALID_FILE_TYPE');
  });
});
