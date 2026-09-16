import { afterEach, describe, expect, it, vi } from 'vitest';
import { getKycApiBase } from './kyc';

describe('KYC API routing', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the same-origin API proxy in the browser when no override exists', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE', '');
    expect(getKycApiBase()).toBe('/api');
  });

  it('honors an explicit API base', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE', 'https://example.test/api');
    expect(getKycApiBase()).toBe('https://example.test/api');
  });
});
