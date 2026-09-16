import { createHmac } from 'crypto';
import { DiditWebhookError, verifyDiditWebhook } from '../core/didit-webhook';

describe('Didit webhook verification', () => {
  const secret = 'test-webhook-secret';
  const now = 1_700_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const payload = Buffer.from(JSON.stringify({
    event_id: 'event-1',
    session_id: 'session-1',
    vendor_data: 'user-1',
    status: 'Approved',
    webhook_type: 'status.updated',
  }));
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  it('accepts a valid raw-body signature and maps status', () => {
    expect(verifyDiditWebhook(payload, { 'x-signature': signature, 'x-timestamp': timestamp }, secret, now))
      .toMatchObject({ eventId: 'event-1', sessionId: 'session-1', status: 'VERIFIED', vendorData: 'user-1' });
  });

  it.each([
    ['missing signature', { 'x-timestamp': timestamp }, payload],
    ['invalid signature', { 'x-signature': '0'.repeat(64), 'x-timestamp': timestamp }, payload],
    ['tampered body', { 'x-signature': signature, 'x-timestamp': timestamp }, Buffer.from('{"session_id":"other"}')],
  ])('rejects %s', (_name, headers, body) => {
    expect(() => verifyDiditWebhook(body as Buffer, headers, secret, now)).toThrow(DiditWebhookError);
  });

  it('fails closed when the secret is missing', () => {
    expect(() => verifyDiditWebhook(payload, { 'x-signature': signature, 'x-timestamp': timestamp }, undefined, now))
      .toThrow(expect.objectContaining({ code: 'WEBHOOK_NOT_CONFIGURED', status: 503 }));
  });

  it('rejects stale timestamps', () => {
    expect(() => verifyDiditWebhook(payload, { 'x-signature': signature, 'x-timestamp': '1' }, secret, now))
      .toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP' }));
  });

  it('rejects invalid payloads after signature verification', () => {
    const invalid = Buffer.from(JSON.stringify({ session_id: 'session-1', status: 'Made Up' }));
    const invalidSignature = createHmac('sha256', secret).update(invalid).digest('hex');
    expect(() => verifyDiditWebhook(invalid, { 'x-signature': invalidSignature, 'x-timestamp': timestamp }, secret, now))
      .toThrow(expect.objectContaining({ code: 'INVALID_PAYLOAD' }));
  });
});
