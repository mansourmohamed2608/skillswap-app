import { describe, expect, it } from 'vitest';
import { toApiError } from './api';

describe('API application error parsing', () => {
  it('preserves a top-level machine-readable error code', async () => {
    const response = new Response(JSON.stringify({
      code: 'LISTING_LIMIT_REACHED',
      message: 'Listing limit reached',
    }), { status: 403 });

    await expect(toApiError(response)).resolves.toMatchObject({
      status: 403,
      code: 'LISTING_LIMIT_REACHED',
      message: 'Listing limit reached',
    });
  });

  it('preserves a Nest nested application error code', async () => {
    const response = new Response(JSON.stringify({
      message: { code: 'KYC_REQUIRED', message: 'Identity verification is required' },
    }), { status: 403 });

    await expect(toApiError(response)).resolves.toMatchObject({
      status: 403,
      code: 'KYC_REQUIRED',
      message: 'Identity verification is required',
    });
  });
});
