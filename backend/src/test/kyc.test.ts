/**
 * KYC Service Tests
 * Tests Didit KYC integration - session creation, status, and webhooks
 */

// Mock dependencies
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: jest.fn(),
            get: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({
    didit: {},
  })),
}));

jest.mock('axios');

import * as admin from 'firebase-admin';
import axios from 'axios';
import { getKycStatus, fetchDiditDecision, clean } from '../core/kyc';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KYC Service', () => {
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Didit config
    process.env.DIDIT_API_KEY = 'test-api-key';
    process.env.DIDIT_WORKFLOW_ID = 'test-workflow-id';
    process.env.DIDIT_CALLBACK_URL = 'https://example.com/kyc/webhook';
    process.env.DIDIT_BASE_URL = 'https://verification.didit.me';

    mockSet = jest.fn().mockResolvedValue({});
    mockGet = jest.fn();

    const mockDoc = jest.fn(() => ({
      set: mockSet,
      get: mockGet,
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: mockSet,
          get: mockGet,
        })),
      })),
    }));

    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: mockDoc,
      })),
    });
  });

  afterEach(() => {
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_WORKFLOW_ID;
    delete process.env.DIDIT_CALLBACK_URL;
    delete process.env.DIDIT_BASE_URL;
  });

  describe('clean utility', () => {
    it('should remove undefined values from object', () => {
      const input = { a: 1, b: undefined, c: 'test', d: null };
      const result = clean(input);
      expect(result).toEqual({ a: 1, c: 'test', d: null });
    });

    it('should return empty object for all undefined values', () => {
      const input = { a: undefined, b: undefined };
      const result = clean(input);
      expect(result).toEqual({});
    });

    it('should preserve falsy values except undefined', () => {
      const input = { a: 0, b: false, c: '', d: null };
      const result = clean(input);
      expect(result).toEqual({ a: 0, b: false, c: '', d: null });
    });
  });


  describe('getKycStatus', () => {
    it('should return KYC status when document exists', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'VERIFIED',
          provider: 'didit',
          referenceId: 'ref-123',
          score: 95,
        }),
      });

      const result = await getKycStatus('user-123');

      expect(result).toEqual({
        status: 'VERIFIED',
        provider: 'didit',
        referenceId: 'ref-123',
        score: 95,
      });
    });

    it('should return null when document does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await getKycStatus('user-123');

      expect(result).toBeNull();
    });
  });


  describe('fetchDiditDecision', () => {
    it('should fetch decision for a session', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'approved',
          decision: {
            document_valid: true,
            selfie_match: true,
          },
        },
        status: 200,
      });

      const result = await fetchDiditDecision('session-123');

      expect(result.status).toBe(200);
      expect(result.data.status).toBe('approved');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://verification.didit.me/v2/session/session-123/decision/',
        expect.objectContaining({
          headers: { 'x-api-key': 'test-api-key' },
          timeout: 10000,
        })
      );
    });

    it('should handle non-2xx responses without throwing', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 404,
        data: { error: 'Session not found' },
      });

      const result = await fetchDiditDecision('invalid-session');

      expect(result.status).toBe(404);
      expect(result.data.error).toBe('Session not found');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.DIDIT_API_KEY;

      await expect(fetchDiditDecision('session-123'))
        .rejects.toThrow('Missing DIDIT_API_KEY');
    });
  });
});
