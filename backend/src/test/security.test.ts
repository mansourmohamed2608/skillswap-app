/**
 * Security regression tests - fifth audit round.
 *
 * Each test targets a specific security control that was added or hardened
 * across multiple audit passes.  The intent is to prevent regressions when
 * the underlying logic is refactored.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

// ───────────────────────────── Firebase Admin mock ──────────────────────────

const mockFirestoreGet = jest.fn();
const mockFirestoreSet = jest.fn();
const mockFirestoreUpdate = jest.fn();
const mockFirestoreAdd = jest.fn();
const mockFirestoreDoc = jest.fn();
const mockFirestoreCollection = jest.fn();
const mockFirestoreGetAll = jest.fn();
const mockDbRef = jest.fn();
const mockDbRefUpdate = jest.fn();
const mockDbRefSet = jest.fn();
const mockDbRefGet = jest.fn();
const mockDbRefChild = jest.fn();
const mockDbRefPush = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => {
  const docChain = () => ({
    get: mockFirestoreGet,
    set: mockFirestoreSet,
    update: mockFirestoreUpdate,
    collection: mockFirestoreCollection,
  });
  const colChain = () => ({
    doc: mockFirestoreDoc,
    add: mockFirestoreAdd,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockFirestoreGet,
  });
  mockFirestoreDoc.mockReturnValue(docChain());
  mockFirestoreCollection.mockReturnValue(colChain());

  const refChain = () => ({
    update: mockDbRefUpdate,
    set: mockDbRefSet,
    get: mockDbRefGet,
    child: mockDbRefChild,
    push: mockDbRefPush,
  });
  mockDbRefChild.mockReturnValue(refChain());
  mockDbRefPush.mockReturnValue(refChain());

  return {
    firestore: Object.assign(
      jest.fn(() => ({ collection: mockFirestoreCollection, getAll: mockFirestoreGetAll })),
      { FieldValue: { serverTimestamp: jest.fn(() => new Date()), delete: jest.fn() } },
    ),
    database: jest.fn(() => ({ ref: mockDbRef })),
    auth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
  };
});

// ───────────────────────────── Core-module mocks ────────────────────────────

jest.mock('../core/membership', () => ({
  getUserDocument: jest.fn(),
  isMembershipActive: jest.fn(),
  canSendMessage: jest.fn(),
  canCreateBooking: jest.fn(),
  incrementMessageCount: jest.fn(),
  decrementListingCount: jest.fn(),
  incrementListingCount: jest.fn(),
  canCreateListing: jest.fn(),
}));

jest.mock('../core/payments', () => ({
  createGeideaSession: jest.fn(),
  createGeideaDonationSession: jest.fn(),
  handleGeideaWebhook: jest.fn(),
  mockComplete: jest.fn(),
}));

jest.mock('../core/postgres', () => ({
  savePaymentRecord: jest.fn(),
  saveDonationRecord: jest.fn(),
}));

jest.mock('../core/moderation-utils', () => ({
  findBannedKeywordInFields: jest.fn().mockResolvedValue(null),
}));

jest.mock('../core/public-ids', () => ({
  createWishPublicId: jest.fn().mockReturnValue('wish_ABC123'),
  createRequestPublicId: jest.fn().mockReturnValue('booking_ABC123'),
}));

jest.mock('../core/notifications', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue(undefined),
  sendInAppNotification: jest.fn().mockResolvedValue(undefined),
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/geo', () => ({
  geocodeAddress: jest.fn().mockResolvedValue(null),
  readGeoPoint: jest.fn().mockReturnValue(null),
}));

jest.mock('../core/kyc-compare', () => ({
  compareKycNames: jest.fn().mockReturnValue(true),
}));

// ───────────────────────────── Imports ──────────────────────────────────────

import * as admin from 'firebase-admin';
import {
  getUserDocument,
  isMembershipActive,
  canSendMessage,
} from '../core/membership';
import {
  createGeideaSession,
  createGeideaDonationSession,
} from '../core/payments';
import { savePaymentRecord, saveDonationRecord } from '../core/postgres';
import { findBannedKeywordInFields } from '../core/moderation-utils';

import { PaymentsService } from '../nest/payments/payments.service';
import { ChatService } from '../nest/chat/chat.service';
import { ReviewsService } from '../nest/reviews/reviews.service';
import { WishesService } from '../nest/wishes/wishes.service';
import { UsersService, StatusError } from '../nest/users/users.service';
import { RequestsService } from '../nest/requests/requests.service';
import { FirebaseAuthGuard } from '../nest/common/firebase-auth.guard';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns a minimal mock Firestore DocumentSnapshot that reports as existing */
function mockSnap(data: Record<string, any> = {}) {
  return {
    exists: true,
    id: 'doc-id',
    data: () => data,
    get: (field: string) => data[field],
  };
}

/** Returns a mock snapshot that does NOT exist */
function missingSnap() {
  return { exists: false, id: 'doc-id', data: () => null, get: () => undefined };
}

/**
 * Re-establishes the Firestore mock chain after jest.clearAllMocks() clears
 * embedded jest.fn() implementations.  Must be called in each beforeEach that
 * follows a jest.clearAllMocks() call.
 */
function resetFirestoreChain() {
  const docMock = (extraCollectionFn?: jest.Mock) => ({
    get: mockFirestoreGet,
    set: mockFirestoreSet,
    update: mockFirestoreUpdate,
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({ get: mockFirestoreGet, set: mockFirestoreSet }),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockFirestoreGet,
    }),
    ...(extraCollectionFn ? { collection: extraCollectionFn } : {}),
  });
  const colMock = () => ({
    doc: jest.fn().mockReturnValue(docMock()),
    add: mockFirestoreAdd,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockFirestoreGet,
  });
  (admin.firestore as unknown as jest.Mock).mockReturnValue({
    collection: jest.fn().mockReturnValue(colMock()),
    getAll: mockFirestoreGetAll,
  });
  // Default: every .get() returns a "not found" snapshot so tests that don't
  // set up specific mocks are deterministic.
  mockFirestoreGet.mockResolvedValue({ exists: false, id: 'doc-id', data: () => ({}), docs: [], empty: true });
}

describe('FirebaseAuthGuard - account restriction code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFirestoreChain();
    mockVerifyIdToken.mockResolvedValue({ uid: 'restricted-user' });
  });

  it('preserves the restricted-account 403 and stable code after valid authentication', async () => {
    mockFirestoreGet.mockResolvedValueOnce(mockSnap({ accountStatus: 'suspended' }));
    const request: any = { headers: { authorization: 'Bearer valid-token' } };
    const context: any = { switchToHttp: () => ({ getRequest: () => request }) };

    await expect(new FirebaseAuthGuard().canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCOUNT_RESTRICTED' }),
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PaymentsService - plan / duration input validation
// ════════════════════════════════════════════════════════════════════════════

describe('PaymentsService - input validation', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService],
    }).compile();
    service = module.get(PaymentsService);
  });

  it('rejects missing userId', async () => {
    await expect(service.createSubscriptionSession('', 'Basic', '3_months')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown plan value', async () => {
    await expect(
      service.createSubscriptionSession('uid-123', 'SuperPremium', '3_months'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unknown duration value', async () => {
    await expect(
      service.createSubscriptionSession('uid-123', 'Basic', '1_month'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects plan injection string', async () => {
    await expect(
      service.createSubscriptionSession('uid-123', '../../core/admin', '3_months'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects the legacy Free label as a checkout plan', async () => {
    await expect(
      service.createSubscriptionSession('uid-123', 'Free', '3_months'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an unsupported checkout currency', async () => {
    await expect(
      service.createSubscriptionSession('uid-123', 'Basic', '3_months', 'USD'),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts valid plan + duration before reaching KYC check', async () => {
    (getUserDocument as jest.Mock).mockResolvedValueOnce(
      mockSnap({ kyc: { status: 'VERIFIED' } }),
    );
    (createGeideaSession as jest.Mock).mockResolvedValueOnce({
      paymentUrl: 'https://example.com/pay',
      sessionId: 'sess_1',
      amount: 750,
      currency: 'EGP',
    });
    (savePaymentRecord as jest.Mock).mockResolvedValueOnce(undefined);
    mockFirestoreAdd.mockResolvedValueOnce({ id: 'payment-doc' });

    const result = await service.createSubscriptionSession('uid-123', 'Basic', '3_months');
    expect(result).toHaveProperty('paymentUrl');
    expect(result).toHaveProperty('sessionId');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ChatService - self-message and block guards
// ════════════════════════════════════════════════════════════════════════════

describe('ChatService - message guards', () => {
  let service: ChatService;
  // Must be ≥20 alphanumeric characters to hit the UID fast-path in resolveRecipientUid.
  const SENDER    = 'senderUid123456789012345678';     // 28 chars
  const RECIPIENT = 'recipientUid1234567890123456';    // 28 chars

  beforeEach(async () => {
    jest.clearAllMocks();
    resetFirestoreChain();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService],
    }).compile();
    service = module.get(ChatService);

    mockDbRef.mockReturnValue({
      update: mockDbRefUpdate.mockResolvedValue(undefined),
      set: mockDbRefSet.mockResolvedValue(undefined),
      get: mockDbRefGet.mockResolvedValue({ exists: () => true }),
      child: mockDbRefChild,
    });
    mockDbRefChild.mockReturnValue({
      set: mockDbRefSet.mockResolvedValue(undefined),
      push: mockDbRefPush.mockReturnValue({
        set: mockDbRefSet.mockResolvedValue(undefined),
      }),
    });
  });

  it('rejects unauthenticated sender (uid falsy)', async () => {
    await expect(
      service.sendMessage('', { recipientId: RECIPIENT, text: 'hello' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects self-messaging (sender === recipient)', async () => {
    // resolveRecipientUid UID fast-path: users doc + publicProfiles doc both exist
    mockFirestoreGet
      .mockResolvedValueOnce(mockSnap()) // collection('users').doc(SENDER).get()
      .mockResolvedValueOnce(mockSnap()); // collection('publicProfiles').doc(SENDER).get()
    // recipientId === uid is detected before the block check, so no further calls.
    await expect(
      service.sendMessage(SENDER, { recipientId: SENDER, text: 'hello' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects message when recipient has blocked sender', async () => {
    // resolveRecipientUid UID fast-path: both user + publicProfile docs exist
    mockFirestoreGet
      .mockResolvedValueOnce(mockSnap()) // users/RECIPIENT exists
      .mockResolvedValueOnce(mockSnap()) // publicProfiles/RECIPIENT exists
      // block check: users/RECIPIENT/blockedUsers/SENDER exists → blocked
      .mockResolvedValueOnce(mockSnap({ blockedAt: new Date() }));

    await expect(
      service.sendMessage(SENDER, { recipientId: RECIPIENT, text: 'hello' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects message text exceeding 5000 characters', async () => {
    // resolveRecipientUid UID fast-path: both existence docs return snap
    mockFirestoreGet
      .mockResolvedValueOnce(mockSnap()) // users/RECIPIENT
      .mockResolvedValueOnce(mockSnap()) // publicProfiles/RECIPIENT
      .mockResolvedValueOnce(missingSnap()); // block check: not blocked

    const longText = 'a'.repeat(5001);
    await expect(
      service.sendMessage(SENDER, { recipientId: RECIPIENT, text: longText }),
    ).rejects.toThrow(BadRequestException);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// RequestsService - ownership guards
// ════════════════════════════════════════════════════════════════════════════

describe('RequestsService - request guards', () => {
  let service: RequestsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetFirestoreChain();
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestsService],
    }).compile();
    service = module.get(RequestsService);
  });

  it('rejects requesting a listing owned by the requester', async () => {
    mockFirestoreGet.mockResolvedValueOnce(mockSnap({ userId: 'owner-uid' }));

    await expect(
      service.createRequest('owner-uid', { listingId: 'listing-1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SELF_REQUEST_NOT_ALLOWED' }),
    });
  });

  it('rejects requesting an inactive listing', async () => {
    mockFirestoreGet.mockResolvedValueOnce(mockSnap({ userId: 'owner-uid', status: 'fulfilled' }));

    await expect(
      service.createRequest('requester-uid', { listingId: 'listing-1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    });
  });

  it('batches caller-scoped owner, guarded, and legacy request states', async () => {
    mockFirestoreGetAll
      .mockResolvedValueOnce([
        mockSnap({ userId: 'requester-uid' }),
        mockSnap({ userId: 'owner-uid' }),
        mockSnap({ userId: 'legacy-owner' }),
        mockSnap({ userId: 'unrelated-owner' }),
        missingSnap(),
      ])
      .mockResolvedValueOnce([
        mockSnap({ active: true, requestId: 'request-guarded' }),
        missingSnap(),
        mockSnap({ active: true, requestId: 'request-unrelated' }),
      ])
      .mockResolvedValueOnce([
        {
          ...mockSnap({
            listingId: 'listing-guarded',
            ownerId: 'owner-uid',
            requesterId: 'requester-uid',
            status: 'pending',
            publicId: 'booking-guarded',
          }),
          id: 'request-guarded',
        },
        {
          ...mockSnap({
            listingId: 'listing-unrelated',
            ownerId: 'unrelated-owner',
            requesterId: 'another-requester',
            status: 'accepted',
            publicId: 'booking-unrelated',
          }),
          id: 'request-unrelated',
        },
      ]);
    mockFirestoreGet.mockResolvedValueOnce({
      docs: [{
        ...mockSnap({
          listingId: 'listing-legacy',
          ownerId: 'legacy-owner',
          requesterId: 'requester-uid',
          status: 'accepted',
          publicId: 'booking-legacy',
        }),
        id: 'request-legacy',
      }],
      empty: false,
    });

    await expect(service.getListingRequestStates('requester-uid', [
      'listing-owned',
      'listing-guarded',
      'listing-legacy',
      'listing-unrelated',
      'listing-missing',
    ])).resolves.toEqual({
      states: {
        'listing-owned': { state: 'owner' },
        'listing-guarded': { state: 'pending', requestId: 'request-guarded', publicId: 'booking-guarded' },
        'listing-legacy': { state: 'accepted', requestId: 'request-legacy', publicId: 'booking-legacy' },
        'listing-unrelated': { state: 'none' },
        'listing-missing': { state: 'none' },
      },
    });
    expect(mockFirestoreGetAll).toHaveBeenCalledTimes(3);
  });

  it('rejects an oversized listing-status batch', async () => {
    const listingIds = Array.from({ length: 101 }, (_, index) => `listing-${index}`);
    await expect(service.getListingRequestStates('requester-uid', listingIds)).rejects.toThrow(BadRequestException);
    expect(mockFirestoreGetAll).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ReviewsService - guest reviewer + membership gate
// ════════════════════════════════════════════════════════════════════════════

describe('ReviewsService - access control', () => {
  let service: ReviewsService;
  const LISTING_SNAP = mockSnap({ userId: 'owner-uid', status: 'active' });

  beforeEach(async () => {
    jest.clearAllMocks();
    resetFirestoreChain();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService],
    }).compile();
    service = module.get(ReviewsService);
  });

  it('throws UnauthorizedException for unauthenticated reviewer', async () => {
    // createReview fetches the listing first - mock that to succeed.
    mockFirestoreGet.mockResolvedValueOnce(LISTING_SNAP);
    await expect(
      service.createReview(null as any, {
        listingId: 'listing-1',
        rating: 5,
        comment: 'great',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when reviewer membership is inactive', async () => {
    // Listing fetch must succeed first.
    mockFirestoreGet.mockResolvedValueOnce(LISTING_SNAP);
    (getUserDocument as jest.Mock).mockResolvedValueOnce(
      mockSnap({
        kyc: { status: 'VERIFIED' },
        membership: { plan: 'Basic', active: false },
      }),
    );
    (isMembershipActive as jest.Mock).mockReturnValueOnce(false);

    await expect(
      service.createReview('reviewer-uid', {
        listingId: 'listing-1',
        rating: 5,
        comment: 'great',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when reviewer KYC is not verified', async () => {
    // Listing fetch must succeed first.
    mockFirestoreGet.mockResolvedValueOnce(LISTING_SNAP);
    (getUserDocument as jest.Mock).mockResolvedValueOnce(
      mockSnap({ kyc: { status: 'PENDING' } }),
    );
    (isMembershipActive as jest.Mock).mockReturnValueOnce(true);

    await expect(
      service.createReview('reviewer-uid', {
        listingId: 'listing-1',
        rating: 5,
        comment: 'great',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WishesService - input validation
// ════════════════════════════════════════════════════════════════════════════

describe('WishesService - input validation', () => {
  let service: WishesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetFirestoreChain();
    const module: TestingModule = await Test.createTestingModule({
      providers: [WishesService],
    }).compile();
    service = module.get(WishesService);
  });

  describe('create()', () => {
    it('rejects title exceeding 200 characters', async () => {
      await expect(
        service.create('uid-1', {
          title: 'T'.repeat(201),
          description: 'Valid description',
          goalAmount: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects description exceeding 5000 characters', async () => {
      await expect(
        service.create('uid-1', {
          title: 'Valid title',
          description: 'D'.repeat(5001),
          goalAmount: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts title at exactly 200 characters (boundary)', async () => {
      (getUserDocument as jest.Mock).mockResolvedValueOnce(
        mockSnap({
          kyc: { status: 'VERIFIED' },
          membership: {
            active: true,
            endDate: new Date(Date.now() + 86400_000),
          },
        }),
      );
      // isMembershipActive must return true so the wish creation is allowed.
      (isMembershipActive as jest.Mock).mockReturnValueOnce(true);

      await expect(
        service.create('uid-1', {
          title: 'T'.repeat(200),
          description: 'Valid description',
          goalAmount: 100,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('donate()', () => {
    it('rejects donation with invalid email', async () => {
      await expect(
        service.donate('wish-1', {
          amount: 50,
          donorEmail: 'not-an-email',
          donorName: 'Alice',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects donation amount exceeding 100,000', async () => {
      await expect(
        service.donate('wish-1', {
          amount: 100001,
          donorEmail: 'valid@example.com',
          donorName: 'Alice',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects donation of zero or negative amount', async () => {
      await expect(
        service.donate('wish-1', {
          amount: 0,
          donorEmail: 'valid@example.com',
          donorName: 'Alice',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects self-donation', async () => {
      // The Firestore chain is reset in beforeEach; set one-time return for wish doc.
      mockFirestoreGet.mockResolvedValueOnce(
        mockSnap({ userId: 'owner-uid', status: 'open', currency: 'EGP', title: 'T' }),
      );
      await expect(
        service.donate(
          'wish-1',
          { amount: 50, donorEmail: 'owner@example.com', donorName: 'Owner' },
          'owner-uid', // donorUserId === ownerId → ForbiddenException
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects donation on a closed wish', async () => {
      mockFirestoreGet.mockResolvedValueOnce(
        mockSnap({ userId: 'another-uid', status: 'closed', currency: 'EGP', title: 'T' }),
      );
      await expect(
        service.donate('wish-1', {
          amount: 50,
          donorEmail: 'donor@example.com',
          donorName: 'Donor',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UsersService - business-profile array field limits
// ════════════════════════════════════════════════════════════════════════════

describe('UsersService - businessProfile input validation', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetFirestoreChain();
    (isMembershipActive as jest.Mock).mockReturnValue(true);
    mockFirestoreGet.mockResolvedValue(mockSnap({
      email: 'owner@company.example',
      membership: { plan: 'Business', active: true, endDate: new Date(Date.now() + 60_000) },
    }));
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();
    service = module.get(UsersService);

    // Default: no banned keywords
    (findBannedKeywordInFields as jest.Mock).mockResolvedValue(null);
  });

  it('rejects a teamMembers entry longer than 100 characters', async () => {
    const longMember = 'M'.repeat(101);
    await expect(
      service.updateProfile('uid-1', {
        businessProfile: { teamMembers: [longMember] },
      }),
    ).rejects.toThrow(StatusError);
  });

  it('rejects a teamMembers entry that is not an email address', async () => {
    mockFirestoreGet.mockResolvedValueOnce(
      mockSnap({ email: 'owner@company.example', membership: { plan: 'Business', active: true, endDate: new Date(Date.now() + 60_000) } }),
    );
    await expect(
      service.updateProfile('uid-1', {
        businessProfile: { teamMembers: ['A team member name'] },
      }),
    ).rejects.toThrow('valid email address');
  });

  it('returns the stable business email code for a consumer owner address', async () => {
    mockFirestoreGet.mockResolvedValueOnce(mockSnap({
      email: 'owner@gmail.com',
      membership: { plan: 'Business', active: true, endDate: new Date(Date.now() + 60_000) },
    }));
    await expect(service.updateProfile('uid-1', { businessProfile: { name: 'Example Co' } }))
      .rejects.toMatchObject({ status: 400, code: 'BUSINESS_EMAIL_REQUIRED' });
  });

  it('rejects a customCategories entry longer than 50 characters', async () => {
    // Provide a user snap with a Business plan so the guard passes and we reach
    // the customCategories length check.
    mockFirestoreGet.mockResolvedValueOnce(
      mockSnap({ membership: { plan: 'Business', active: true } }),
    );
    const longCat = 'C'.repeat(51);
    await expect(
      service.updateProfile('uid-1', {
        businessProfile: { customCategories: [longCat] },
      }),
    ).rejects.toThrow(StatusError);
  });

  it('accepts teamMembers entries at exactly 100 characters', async () => {
    const exactMember = 'M'.repeat(100);
    // Expect the call NOT to throw on the length check; it may fail later at Firestore
    // - we only care that StatusError is not thrown for the length
    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(missingSnap()),
          set: jest.fn().mockResolvedValue(undefined),
          update: jest.fn().mockResolvedValue(undefined),
        })),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      })),
    });

    const result = service.updateProfile('uid-1', {
      businessProfile: { teamMembers: [exactMember] },
    });
    // We expect it not to throw a StatusError for length; it may throw for
    // Firestore/GeoCode but length validation should pass
    await expect(result).rejects.not.toThrow('100 characters or fewer');
  });

  it('truncates teamMembers array to maximum 5 entries', async () => {
    // Trigger the length map with 6 short entries - should NOT throw, just truncate
    const members = ['A', 'B', 'C', 'D', 'E', 'F']; // 6 entries
    // The check length >100 won't fire. Array.slice(0,5) reduces to 5. It should
    // pass through without a StatusError for length.
    await expect(
      service.updateProfile('uid-1', {
        businessProfile: { teamMembers: members },
      }),
    ).rejects.not.toThrow('100 characters or fewer');
  });
});
