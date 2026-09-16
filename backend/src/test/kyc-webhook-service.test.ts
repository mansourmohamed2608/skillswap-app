import { createHmac } from 'crypto';

const transactionGet = jest.fn();
const transactionCreate = jest.fn();
const transactionSet = jest.fn();
const referenceGet = jest.fn();

jest.mock('firebase-admin', () => {
  const makeDoc = (path: string): any => ({
    path,
    get: path.startsWith('kycReferences/') ? referenceGet : jest.fn(),
    collection: (name: string) => ({ doc: (id: string) => makeDoc(`${path}/${name}/${id}`) }),
  });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => makeDoc(`${name}/${id}`) }),
    runTransaction: jest.fn(async (callback: any) => callback({
      get: transactionGet,
      create: transactionCreate,
      set: transactionSet,
    })),
  };
  return { firestore: jest.fn(() => db) };
});

import * as admin from 'firebase-admin';
import { KycService } from '../nest/kyc/kyc.service';

describe('KycService Didit webhook mutation boundary', () => {
  const secret = 'service-test-secret';
  const payload = Buffer.from(JSON.stringify({
    event_id: 'evt-1', session_id: 'session-1', vendor_data: 'user-1', status: 'Approved',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DIDIT_WEBHOOK_SECRET = secret;
    referenceGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'user-1' }) });
    transactionGet.mockResolvedValue({ exists: false });
  });

  afterEach(() => delete process.env.DIDIT_WEBHOOK_SECRET);

  function headers() {
    return {
      'x-signature': createHmac('sha256', secret).update(payload).digest('hex'),
      'x-timestamp': String(Math.floor(Date.now() / 1000)),
    };
  }

  it('mutates only the correlated user after valid verification', async () => {
    const result = await new KycService().handleDiditWebhook(payload, headers());
    expect(result).toEqual({ accepted: true, duplicate: false });
    expect(transactionCreate).toHaveBeenCalledTimes(1);
    const writtenPaths = transactionSet.mock.calls.map(([ref]) => ref.path);
    expect(writtenPaths).toContain('users/user-1/kyc/status');
    expect(writtenPaths).toContain('users/user-1');
    expect(writtenPaths.some((path) => path.includes('other-user'))).toBe(false);
  });

  it('acknowledges a duplicate without repeating state mutation', async () => {
    transactionGet.mockResolvedValue({ exists: true });
    const result = await new KycService().handleDiditWebhook(payload, headers());
    expect(result).toEqual({ accepted: true, duplicate: true });
    expect(transactionCreate).not.toHaveBeenCalled();
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it('rejects an unknown session without a transaction', async () => {
    referenceGet.mockResolvedValue({ exists: false, data: () => undefined });
    await expect(new KycService().handleDiditWebhook(payload, headers()))
      .rejects.toMatchObject({ code: 'UNKNOWN_SESSION' });
    expect((admin.firestore() as any).runTransaction).not.toHaveBeenCalled();
  });

  it('rejects vendor/session mismatch before mutation', async () => {
    referenceGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'other-user' }) });
    await expect(new KycService().handleDiditWebhook(payload, headers()))
      .rejects.toMatchObject({ code: 'SESSION_MISMATCH' });
    expect(transactionSet).not.toHaveBeenCalled();
  });
});
