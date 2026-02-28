function slugify(value: string, fallback: string): string {
    const normalized = String(value || '')
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 80);
    return normalized || fallback;
  }
  
  function shortHash(input: string): string {
    let hash = 5381;
    const text = String(input || '');
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return Math.abs(hash >>> 0).toString(36).slice(0, 8);
  }
  
  export function createListingPublicId(args: { id: string; title?: string }) {
    return `${slugify(args.title || '', 'listing')}-${shortHash(args.id)}`;
  }
  
  export function createWishPublicId(args: { id: string; title?: string }) {
    return `${slugify(args.title || '', 'wish')}-${shortHash(args.id)}`;
  }
  
  export function createRequestPublicId(args: {
    id: string;
    listingId?: string;
    ownerId?: string;
    requesterId?: string;
  }) {
    const base = [args.listingId, args.ownerId, args.requesterId, args.id].filter(Boolean).join(':');
    return `booking-${shortHash(base || args.id)}`;
  }
  