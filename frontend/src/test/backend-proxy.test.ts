import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildBackendApiUrl, resolveBackendFunctionBase } from '@/lib/backend-proxy';
import { MATCHMAKING_ENDPOINTS } from '@/services/matchmakingApi';

describe('backend-proxy', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'skillswap-69yxi';
    process.env.NEXT_PUBLIC_FUNCTIONS_REGION = 'europe-west3';
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_FUNCTIONS_BASE;
  });

  afterEach(() => {
    process.env = env;
  });

  it('resolves Cloud function base with function name', () => {
    expect(resolveBackendFunctionBase()).toBe(
      'https://europe-west3-skillswap-69yxi.cloudfunctions.net/api'
    );
  });

  it('builds Nest routes with double /api prefix for Cloud Functions', () => {
    expect(buildBackendApiUrl('/api/matchmaking/cycles3')).toBe(
      'https://europe-west3-skillswap-69yxi.cloudfunctions.net/api/api/matchmaking/cycles3'
    );
    expect(buildBackendApiUrl('/api/matchmaking/listing-matches')).toBe(
      'https://europe-west3-skillswap-69yxi.cloudfunctions.net/api/api/matchmaking/listing-matches'
    );
  });

  it('uses configured FUNCTIONS_BASE when provided', () => {
    process.env.NEXT_PUBLIC_FUNCTIONS_BASE = 'https://europe-west3-skillswap-69yxi.cloudfunctions.net';
    expect(buildBackendApiUrl('/api/listings/create')).toBe(
      'https://europe-west3-skillswap-69yxi.cloudfunctions.net/api/api/listings/create'
    );
  });

  it('uses emulator base in development', () => {
    process.env.NODE_ENV = 'development';
    expect(resolveBackendFunctionBase()).toBe(
      'http://127.0.0.1:5001/skillswap-69yxi/europe-west3/api'
    );
  });
});

describe('matchmaking API contract', () => {
  it('uses canonical backend paths (not stale aliases)', () => {
    expect(MATCHMAKING_ENDPOINTS.cycles3).toBe('/api/matchmaking/cycles3');
    expect(MATCHMAKING_ENDPOINTS.listingMatches).toBe('/api/matchmaking/listing-matches');
    expect(MATCHMAKING_ENDPOINTS.mutual2).toBe('/api/matchmaking/mutual2');
  });

  it('does not reference non-existent shortened cycle routes', () => {
    const values = Object.values(MATCHMAKING_ENDPOINTS);
    expect(values.some((path) => path.endsWith('/cycles'))).toBe(false);
    expect(values.some((path) => path.includes('cycles3'))).toBe(true);
  });
});
