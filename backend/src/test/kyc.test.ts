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

jest.mock('axios');

import * as admin from 'firebase-admin';
import { getKycStatus, clean, normalizeKycStatus, toPublicKycResult } from '../core/kyc';


describe('KYC Service', () => {
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up Didit config
    process.env.DIDIT_API_KEY = 'test-api-key';
    process.env.DIDIT_WORKFLOW_ID = 'test-workflow-id';
    process.env.DIDIT_CALLBACK_URL = 'https://example.com/kyc/done';
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

  describe('public KYC state', () => {
    it('normalizes provider status variants', () => {
      expect(normalizeKycStatus('Approved')).toBe('VERIFIED');
      expect(normalizeKycStatus('In Review')).toBe('IN_REVIEW');
      expect(normalizeKycStatus('IN_REVIEW')).toBe('IN_REVIEW');
      expect(normalizeKycStatus('rejected')).toBe('FAILED');
    });

    it('does not expose stale identity fields for a failed attempt', () => {
      const result = toPublicKycResult({
        status: 'FAILED',
        provider: 'didit',
        reason: 'Document unreadable',
        verifiedName: 'Historical Name',
        documentNumber: '12345678901234',
        birthDate: '1990-01-01',
      });

      expect(result).toEqual({
        status: 'FAILED',
        provider: 'didit',
        reason: 'Document unreadable',
      });
      expect(result).not.toHaveProperty('documentNumber');
      expect(result).not.toHaveProperty('verifiedName');
    });
  });


});
