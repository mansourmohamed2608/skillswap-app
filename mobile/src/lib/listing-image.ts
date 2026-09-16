export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LISTING_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export type ListingImageValidation = 'VALID' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE';

export function validateListingImage(asset: { fileSize?: number | null; mimeType?: string | null }): ListingImageValidation {
  if (asset.mimeType && !ALLOWED_LISTING_IMAGE_TYPES.has(asset.mimeType.toLowerCase())) {
    return 'INVALID_FILE_TYPE';
  }
  if (asset.fileSize && asset.fileSize > MAX_LISTING_IMAGE_BYTES) return 'FILE_TOO_LARGE';
  return 'VALID';
}

export function listingImageExtension(mimeType: string): string {
  if (mimeType.toLowerCase() === 'image/png') return 'png';
  if (mimeType.toLowerCase() === 'image/webp') return 'webp';
  return 'jpg';
}
