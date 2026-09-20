/**
 * Membership Service Tests
 * Tests membership validation, plan limits, and counters
 */

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
    runTransaction: jest.fn(),
  })),
}));

import * as admin from 'firebase-admin';
import {
  isMembershipActive,
  canCreateListing,
  canCreateBooking,
  canSendMessage,
  getUserDocument,
  incrementListingCount,
  decrementListingCount,
} from '../core/membership';

describe('Membership Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isMembershipActive', () => {
    it('should return false for null membership', () => {
      expect(isMembershipActive(null)).toBe(false);
    });

    it('should return false for undefined membership', () => {
      expect(isMembershipActive(undefined)).toBe(false);
    });

    it('should return false for empty membership object', () => {
      expect(isMembershipActive({})).toBe(false);
    });

    it('should return true for membership with future endDate', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const membership = { endDate: futureDate };
      expect(isMembershipActive(membership)).toBe(true);
    });

    it('should return false for membership with past endDate', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const membership = { endDate: pastDate };
      expect(isMembershipActive(membership)).toBe(false);
    });

    it('should handle Firestore Timestamp-like objects', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const membership = {
        endDate: { toDate: () => futureDate },
      };
      expect(isMembershipActive(membership)).toBe(true);
    });

    it('should handle numeric timestamps', () => {
      const futureTimestamp = Date.now() + 86400000;
      const membership = { endDate: futureTimestamp };
      expect(isMembershipActive(membership)).toBe(true);
    });

    it('should handle ISO string dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const membership = { endDate: futureDate };
      expect(isMembershipActive(membership)).toBe(true);
    });

    it('should return false for invalid date', () => {
      const membership = { endDate: 'invalid-date' };
      expect(isMembershipActive(membership)).toBe(false);
    });
  });

  describe('canCreateListing', () => {
    describe('Basic Plan', () => {
      it('should allow listing when under limit', () => {
        const membership = {
          plan: 'Basic',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 5,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });

      it('should block listing at limit (9)', () => {
        const membership = {
          plan: 'Basic',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 9,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(false);
        expect(result.code).toBe('LISTING_LIMIT_REACHED');
        expect(result.reason).toContain('9');
        expect(result.reason).toContain('Basic');
      });

      it('should block listing over limit', () => {
        const membership = {
          plan: 'Basic',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 15,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(false);
      });
    });

    describe('Standard Plan', () => {
      it('should allow listing when under limit', () => {
        const membership = {
          plan: 'Standard',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 10,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });

      it('should block listing at limit (12)', () => {
        const membership = {
          plan: 'Standard',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 12,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('12');
      });
    });

    describe('Pro Plan', () => {
      it('should allow unlimited listings', () => {
        const membership = {
          plan: 'Pro',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 100,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });

      it('should allow listings with very high count', () => {
        const membership = {
          plan: 'Pro',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 10000,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Business Plan', () => {
      it('should allow unlimited listings', () => {
        const membership = {
          plan: 'Business',
          active: true,
          endDate: new Date(Date.now() + 86400000),
          listingCount: 500,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });
    });

    describe('subscribed-only publication policy', () => {
      it('blocks listing publication when membership is expired', () => {
        const membership = {
          plan: 'Pro',
          active: true,
          endDate: new Date(Date.now() - 86400000), // Expired
          listingCount: 0,
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(false);
        expect(result.code).toBe('MEMBERSHIP_REQUIRED');
      });

      it('blocks even a first listing without membership', () => {
        const result = canCreateListing(null, 1);
        expect(result.allowed).toBe(false);
        expect(result.code).toBe('MEMBERSHIP_REQUIRED');
      });

      it('uses the authoritative active-listing count instead of a stale counter', () => {
        expect(canCreateListing({ plan: 'Basic', active: true, endDate: new Date(Date.now() + 86400000), listingCount: 9 }, 0).allowed).toBe(true);
      });

      it('blocks malformed and pending memberships', () => {
        expect(canCreateListing({ plan: 'Unknown', active: true, endDate: new Date(Date.now() + 86400000) }).code).toBe('MEMBERSHIP_REQUIRED');
        expect(canCreateListing({ plan: 'Basic', active: false, endDate: new Date(Date.now() + 86400000) }).code).toBe('MEMBERSHIP_REQUIRED');
      });
    });

    describe('Default Count', () => {
      it('should default listingCount to 0 when not provided', () => {
        const membership = {
          plan: 'Basic',
          active: true,
          endDate: new Date(Date.now() + 86400000),
        };
        const result = canCreateListing(membership);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('canCreateBooking', () => {
    it('should enforce Basic plan booking limit of 9', () => {
      const membership = {
        plan: 'Basic',
        active: true,
        endDate: new Date(Date.now() + 86400000),
        bookingCount: 9,
      };
      const result = canCreateBooking(membership);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('BOOKING_LIMIT_REACHED');
      expect(result.reason).toContain('9');
    });

    it('should allow unlimited bookings for Pro plan', () => {
      const membership = {
        plan: 'Pro',
        active: true,
        endDate: new Date(Date.now() + 86400000),
        bookingCount: 1000,
      };
      const result = canCreateBooking(membership);
      expect(result.allowed).toBe(true);
    });

    it('should block booking when membership expired', () => {
      const membership = {
        plan: 'Pro',
        active: true,
        endDate: new Date(Date.now() - 86400000),
        bookingCount: 0,
      };
      const result = canCreateBooking(membership);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('MEMBERSHIP_REQUIRED');
    });
  });

  describe('canSendMessage', () => {
    it('should enforce Basic plan message limit of 9', () => {
      const membership = {
        plan: 'Basic',
        active: true,
        endDate: new Date(Date.now() + 86400000),
        messageCount: 9,
      };
      const result = canSendMessage(membership);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('MESSAGE_LIMIT_REACHED');
      expect(result.reason).toContain('9');
    });

    it('should enforce Standard plan message limit of 12', () => {
      const membership = {
        plan: 'Standard',
        active: true,
        endDate: new Date(Date.now() + 86400000),
        messageCount: 12,
      };
      const result = canSendMessage(membership);
      expect(result.allowed).toBe(false);
    });

    it('should allow unlimited messages for Business plan', () => {
      const membership = {
        plan: 'Business',
        active: true,
        endDate: new Date(Date.now() + 86400000),
        messageCount: 5000,
      };
      const result = canSendMessage(membership);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getUserDocument', () => {
    it('should return user document when exists', async () => {
      const mockSnapshot = {
        exists: true,
        id: 'user-123',
        data: () => ({ name: 'Test User' }),
      };

      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockGet,
          })),
        })),
      });

      const result = await getUserDocument('user-123');
      expect(result.exists).toBe(true);
    });

    it('should throw error when user does not exist', async () => {
      const mockSnapshot = { exists: false };
      const mockGet = jest.fn().mockResolvedValue(mockSnapshot);
      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockGet,
          })),
        })),
      });

      await expect(getUserDocument('non-existent')).rejects.toThrow(
        'User non-existent does not exist'
      );
    });
  });

  describe('incrementListingCount', () => {
    it('should increment listing count in transaction', async () => {
      const mockUpdate = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        get: (field: string) => ({ listingCount: 5 }),
      });

      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({})),
        })),
        runTransaction: jest.fn(async (callback) => {
          await callback({
            get: mockGet,
            update: mockUpdate,
          });
        }),
      });

      await incrementListingCount('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { 'membership.listingCount': 6 }
      );
    });

    it('should initialize a listing counter when user has no membership', async () => {
      const mockUpdate = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        get: () => null,
      });

      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({})),
        })),
        runTransaction: jest.fn(async (callback) => {
          await callback({
            get: mockGet,
            update: mockUpdate,
          });
        }),
      });

      await expect(incrementListingCount('user-123')).resolves.toBeUndefined();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { 'membership.listingCount': 1 }
      );
    });
  });

  describe('decrementListingCount', () => {
    it('should decrement listing count but not below 0', async () => {
      const mockUpdate = jest.fn();
      const mockGet = jest.fn().mockResolvedValue({
        get: (field: string) => ({ listingCount: 0 }),
      });

      (admin.firestore as unknown as jest.Mock).mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({})),
        })),
        runTransaction: jest.fn(async (callback) => {
          await callback({
            get: mockGet,
            update: mockUpdate,
          });
        }),
      });

      await decrementListingCount('user-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { 'membership.listingCount': 0 } // Should not go negative
      );
    });
  });
});
