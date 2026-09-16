import { createHash, createHmac, timingSafeEqual } from 'crypto';

export class DiditWebhookError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export type DiditWebhookEvent = {
  sessionId: string;
  eventId: string;
  status: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED';
  providerStatus: string;
  vendorData?: string;
  webhookType?: string;
};

function safeEqualHex(provided: string, expected: string) {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyDiditWebhook(
  rawBody: Buffer,
  headers: Record<string, unknown>,
  secret: string | undefined,
  nowMs = Date.now(),
): DiditWebhookEvent {
  if (!secret) throw new DiditWebhookError(503, 'WEBHOOK_NOT_CONFIGURED', 'KYC webhook is not configured');
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    throw new DiditWebhookError(400, 'INVALID_PAYLOAD', 'Missing raw webhook body');
  }
  const signature = String(headers['x-signature'] || '').trim().toLowerCase();
  const timestampText = String(headers['x-timestamp'] || '').trim();
  if (!signature || !timestampText) {
    throw new DiditWebhookError(401, 'INVALID_SIGNATURE', 'Missing Didit webhook signature');
  }
  const timestamp = Number(timestampText);
  if (!Number.isInteger(timestamp) || Math.abs(Math.floor(nowMs / 1000) - timestamp) > 300) {
    throw new DiditWebhookError(401, 'INVALID_TIMESTAMP', 'Webhook timestamp is invalid or stale');
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(signature) || !safeEqualHex(signature, expected)) {
    throw new DiditWebhookError(401, 'INVALID_SIGNATURE', 'Invalid Didit webhook signature');
  }

  let body: any;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new DiditWebhookError(400, 'INVALID_PAYLOAD', 'Invalid webhook JSON');
  }
  const sessionId = String(body?.session_id || '').trim();
  const providerStatus = String(body?.status || '').trim();
  if (!sessionId || !providerStatus) {
    throw new DiditWebhookError(400, 'INVALID_PAYLOAD', 'Webhook session_id and status are required');
  }
  const normalized = providerStatus.toLowerCase();
  const status = normalized === 'approved'
    ? 'VERIFIED'
    : normalized === 'in review' || normalized === 'in_review'
      ? 'IN_REVIEW'
      : normalized === 'declined' || normalized === 'abandoned'
        ? 'FAILED'
        : normalized === 'not started' || normalized === 'in progress' || normalized === 'pending'
          ? 'PENDING'
          : null;
  if (!status) throw new DiditWebhookError(400, 'INVALID_PAYLOAD', 'Unsupported webhook status');

  const suppliedEventId = String(body?.event_id || '').trim();
  return {
    sessionId,
    eventId: suppliedEventId || createHash('sha256').update(rawBody).digest('hex'),
    status,
    providerStatus,
    vendorData: body?.vendor_data == null ? undefined : String(body.vendor_data),
    webhookType: body?.webhook_type == null ? undefined : String(body.webhook_type),
  };
}
