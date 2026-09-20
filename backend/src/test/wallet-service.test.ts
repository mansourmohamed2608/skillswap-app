import { BadRequestException, ForbiddenException } from '@nestjs/common';

const mockSaveTokenTransactionRecord = jest.fn();
const mockSaveWishContributionRecord = jest.fn();
const mockSendInAppNotification = jest.fn();
const mockCreateTokenSession = jest.fn();
const mockTxGet = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxCreate = jest.fn();
const mockRunTransaction = jest.fn(async (callback: any) => callback({
  get: mockTxGet,
  update: mockTxUpdate,
  create: mockTxCreate,
}));

type MockRef = { collection: string; id: string; get: jest.Mock; set: jest.Mock; update: jest.Mock };
const refs = new Map<string, MockRef>();
const mockCollection = jest.fn((collection: string) => ({
  doc: jest.fn((id = `generated-${collection}`) => {
    const key = `${collection}/${id}`;
    if (!refs.has(key)) {
      refs.set(key, { collection, id, get: jest.fn(), set: jest.fn(), update: jest.fn() });
    }
    return refs.get(key);
  }),
}));
const mockFirestore: any = jest.fn(() => ({ collection: mockCollection, runTransaction: mockRunTransaction }));
mockFirestore.FieldValue = { increment: (value: number) => ({ increment: value }) };

jest.mock('firebase-admin', () => ({ firestore: mockFirestore }));
jest.mock('../core/payments', () => ({ createGeideaTokenPurchaseSession: mockCreateTokenSession }));
jest.mock('../core/postgres', () => ({
  saveTokenTransactionRecord: mockSaveTokenTransactionRecord,
  saveWishContributionRecord: mockSaveWishContributionRecord,
}));
jest.mock('../core/notifications', () => ({ sendInAppNotification: mockSendInAppNotification }));
jest.mock('../core/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { WalletService } from '../nest/wallet/wallet.service';

function snap(data: Record<string, any>, exists = true) {
  return { exists, data: () => data, get: (field: string) => data[field] };
}

describe('WalletService contribution integrity', () => {
  let service: WalletService;

  beforeEach(() => {
    jest.clearAllMocks();
    refs.clear();
    service = new WalletService();
    mockSaveWishContributionRecord.mockResolvedValue(undefined);
    mockSendInAppNotification.mockResolvedValue(undefined);
  });

  function arrangeContribution(options?: { balance?: number; ownerId?: string; status?: string; existing?: Record<string, any> }) {
    const ownerId = options?.ownerId ?? 'owner-1';
    mockTxGet.mockImplementation(async (ref: MockRef) => {
      if (ref.collection === 'wishContributions') return options?.existing ? snap(options.existing) : snap({}, false);
      if (ref.collection === 'wishes') return snap({ userId: ownerId, status: options?.status ?? 'open', title: 'Local wish' });
      if (ref.collection === 'users' && ref.id === 'member-1') return snap({ tokenBalance: options?.balance ?? 100 });
      if (ref.collection === 'users' && ref.id === ownerId) return snap({ tokenBalance: 5 });
      return snap({}, false);
    });
  }

  it('atomically debits, credits, updates progress, and creates one contribution record', async () => {
    arrangeContribution();
    const result = await service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 30, idempotencyKey: 'local-key-123',
    });

    expect(result).toEqual(expect.objectContaining({
      tokenAmount: 30, platformFee: 3, contributionAmount: 27, duplicate: false,
    }));
    expect(mockTxUpdate).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users', id: 'member-1' }), expect.objectContaining({ tokenBalance: 70 }));
    expect(mockTxUpdate).toHaveBeenCalledWith(expect.objectContaining({ collection: 'users', id: 'owner-1' }), { tokenBalance: { increment: 27 } });
    expect(mockTxUpdate).toHaveBeenCalledWith(expect.objectContaining({ collection: 'wishes', id: 'wish-1' }), expect.objectContaining({ totalDonated: { increment: 27 } }));
    expect(mockTxCreate).toHaveBeenCalledTimes(1);
    expect(mockSaveWishContributionRecord).toHaveBeenCalledTimes(1);
  });

  it('returns an idempotent replay without applying any ledger writes twice', async () => {
    arrangeContribution({ existing: {
      wishId: 'wish-1', wishTitle: 'Local wish', wishOwnerId: 'owner-1', tokenAmount: 30,
    } });
    const result = await service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 30, idempotencyKey: 'local-key-123',
    });
    expect(result.duplicate).toBe(true);
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxCreate).not.toHaveBeenCalled();
    expect(mockSaveWishContributionRecord).not.toHaveBeenCalled();
    expect(mockSendInAppNotification).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for different terms', async () => {
    arrangeContribution({ existing: {
      wishId: 'different-wish', wishOwnerId: 'owner-1', tokenAmount: 30,
    } });
    await expect(service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 30, idempotencyKey: 'local-key-123',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('uses the fresh transactional balance and rejects overspending without partial writes', async () => {
    arrangeContribution({ balance: 10 });
    await expect(service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 30, idempotencyKey: 'local-key-123',
    })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'INSUFFICIENT_BALANCE' }) });
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxCreate).not.toHaveBeenCalled();
  });

  it('rejects own and closed wishes', async () => {
    arrangeContribution({ ownerId: 'member-1' });
    await expect(service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 10, idempotencyKey: 'local-key-123',
    })).rejects.toBeInstanceOf(ForbiddenException);

    jest.clearAllMocks();
    arrangeContribution({ status: 'closed' });
    await expect(service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount: 10, idempotencyKey: 'local-key-456',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER])('rejects invalid token amount %s', async (tokenAmount) => {
    await expect(service.contributeToWish('member-1', {
      wishId: 'wish-1', tokenAmount, idempotencyKey: 'local-key-123',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported purchase currency before opening a gateway session', async () => {
    const userRef = { collection: 'users', id: 'member-1', get: jest.fn().mockResolvedValue(snap({ email: 'local@example.test' })), set: jest.fn(), update: jest.fn() };
    refs.set('users/member-1', userRef);
    await expect(service.createTokenPurchaseSession('member-1', { tokenAmount: 10, currency: 'USD' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockCreateTokenSession).not.toHaveBeenCalled();
  });
});
