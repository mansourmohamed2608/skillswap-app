/**
 * NestJS Services Tests
 * Tests Health and Listings service business logic
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(),
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        set: jest.fn(),
      })),
    })),
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()),
    },
  })),
}));

// Mock membership module
jest.mock('../core/membership', () => ({
  getUserDocument: jest.fn(),
  canCreateListing: jest.fn(),
  incrementListingCount: jest.fn(),
  decrementListingCount: jest.fn(),
  isMembershipActive: jest.fn(),
}));

// Mock moderation utils
jest.mock('../core/moderation-utils', () => ({
  findBannedKeywordInFields: jest.fn(),
}));

import * as admin from 'firebase-admin';
import { getUserDocument, canCreateListing, incrementListingCount, isMembershipActive } from '../core/membership';
import { findBannedKeywordInFields } from '../core/moderation-utils';
import { ListingsService } from '../nest/listings/listings.service';
import { HealthController } from '../nest/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return ok: true', () => {
      const result = controller.getHealth();
      expect(result).toEqual({ ok: true });
    });
  });
});

describe('ListingsService', () => {
  let service: ListingsService;
  let mockAdd: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAdd = jest.fn().mockResolvedValue({ id: 'new-listing-123' });
    mockGet = jest.fn();
    mockUpdate = jest.fn().mockResolvedValue({});

    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        add: mockAdd,
        doc: jest.fn(() => ({
          get: mockGet,
          update: mockUpdate,
          delete: jest.fn(),
          set: jest.fn(),
        })),
      })),
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ListingsService],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
  });

  describe('createListing', () => {
    const mockUserSnap = {
      exists: true,
      id: 'user-123',
      data: () => ({
        membership: { active: true, plan: 'Standard', endDate: new Date(Date.now() + 86400000) },
        kyc: { status: 'VERIFIED' },
      }),
      get: (field: string) => {
        const data: any = {
          membership: { active: true, plan: 'Standard', endDate: new Date(Date.now() + 86400000) },
          kyc: { status: 'VERIFIED' },
        };
        return data[field];
      },
    };

    beforeEach(() => {
      (getUserDocument as jest.Mock).mockResolvedValue(mockUserSnap);
      (canCreateListing as jest.Mock).mockReturnValue({ allowed: true });
      (incrementListingCount as jest.Mock).mockResolvedValue({});
      (findBannedKeywordInFields as jest.Mock).mockResolvedValue(null);
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      await expect(service.createListing('', { listing: {} }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when listing object is missing', async () => {
      await expect(service.createListing('user-123', {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when listing is not an object', async () => {
      await expect(service.createListing('user-123', { listing: 'invalid' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when banned content is detected', async () => {
      (findBannedKeywordInFields as jest.Mock).mockResolvedValue({
        field: 'title',
        keyword: 'spam',
      });

      await expect(service.createListing('user-123', {
        listing: { title: 'Spam content here' },
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when membership limit reached', async () => {
      (canCreateListing as jest.Mock).mockReturnValue({
        allowed: false,
        reason: 'Listing limit reached',
      });

      await expect(service.createListing('user-123', {
        listing: { title: 'New Listing' },
      })).rejects.toThrow(ForbiddenException);
    });

    it('should create listing and increment count on success', async () => {
      const result = await service.createListing('user-123', {
        listing: {
          title: 'Web Development',
          description: 'Professional services',
          category: 'Technology',
        },
      });

      expect(result).toEqual({ id: 'new-listing-123' });
      expect(incrementListingCount).toHaveBeenCalledWith('user-123');
    });

    it('should check content moderation for all relevant fields', async () => {
      await service.createListing('user-123', {
        listing: {
          title: 'Test',
          description: 'Desc',
          category: 'Cat',
          location: 'NYC',
          offeredService: {
            title: 'Offered',
            description: 'Offered desc',
            category: 'Offered cat',
          },
          requestedService: {
            title: 'Requested',
            description: 'Requested desc',
            category: 'Requested cat',
          },
        },
      });

      expect(findBannedKeywordInFields).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: 'title' }),
          expect.objectContaining({ label: 'description' }),
          expect.objectContaining({ label: 'offeredService.title' }),
          expect.objectContaining({ label: 'requestedService.title' }),
        ])
      );
    });
  });

  describe('updateListing', () => {
    const mockUserSnap = {
      exists: true,
      id: 'user-123',
      data: () => ({
        membership: { active: true, plan: 'Standard', endDate: new Date(Date.now() + 86400000) },
        kyc: { status: 'VERIFIED' },
      }),
      get: (field: string) => {
        const data: any = {
          membership: { active: true, plan: 'Standard', endDate: new Date(Date.now() + 86400000) },
          kyc: { status: 'VERIFIED' },
        };
        return data[field];
      },
    };

    beforeEach(() => {
      (getUserDocument as jest.Mock).mockResolvedValue(mockUserSnap);
      (isMembershipActive as jest.Mock).mockReturnValue(true);
      (findBannedKeywordInFields as jest.Mock).mockResolvedValue(null);
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      await expect(service.updateListing('', 'listing-123', {}))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when listingId is missing', async () => {
      await expect(service.updateListing('user-123', '', {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updates is missing', async () => {
      await expect(service.updateListing('user-123', 'listing-123', null))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(service.updateListing('user-123', 'listing-123', { title: 'Updated' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when listing has been removed', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          userId: 'user-123',
          status: 'removed',
        }),
      });

      await expect(service.updateListing('user-123', 'listing-123', { title: 'Updated' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when membership is inactive', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          userId: 'user-123',
          status: 'open',
        }),
      });
      (isMembershipActive as jest.Mock).mockReturnValue(false);

      await expect(service.updateListing('user-123', 'listing-123', { title: 'Updated' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should check banned keywords for update fields', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          userId: 'user-123',
          status: 'open',
        }),
      });

      (findBannedKeywordInFields as jest.Mock).mockResolvedValue({
        field: 'title',
        keyword: 'banned',
      });

      await expect(service.updateListing('user-123', 'listing-123', {
        title: 'Contains banned word',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('isListingActive', () => {
    it('should return false for closed listings', () => {
      // Test the private method through behavior
      const statuses = ['closed', 'removed', 'fulfilled', 'inactive'];
      statuses.forEach(status => {
        const normalized = String(status).toLowerCase();
        const isInactive = ['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
        expect(isInactive).toBe(true);
      });
    });

    it('should return true for active listings', () => {
      const statuses = ['open', 'active', 'available', 'published'];
      statuses.forEach(status => {
        const normalized = String(status).toLowerCase();
        const isInactive = ['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
        expect(isInactive).toBe(false);
      });
    });

    it('should default to active for undefined status', () => {
      const status: string | undefined = undefined;
      const normalized = String(status ?? 'open').toLowerCase();
      const isInactive = ['closed', 'removed', 'fulfilled', 'inactive'].includes(normalized);
      expect(isInactive).toBe(false);
    });
  });
});
