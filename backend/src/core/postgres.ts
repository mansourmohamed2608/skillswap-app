import { Pool, PoolConfig } from 'pg';
import { logger } from './logger';

const connectionString: string | undefined = process.env.POSTGRES_CONNECTION_STRING;

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';

let pool: Pool | null = null;
let poolInitialized = false;

function getPool(): Pool | null {
  if (poolInitialized) return pool;
  poolInitialized = true;
  if (!connectionString) return null;
  
  const poolConfig: PoolConfig = {
    connectionString,
    // Connection pool settings
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  
  // SSL configuration
  if (connectionString.includes('sslmode=require')) {
    poolConfig.ssl = IS_PRODUCTION
      ? { rejectUnauthorized: true } // Validate certs in production (Cloud SQL provides valid certs)
      : { rejectUnauthorized: false }; // Allow self-signed in development
  }
  
  pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    logger.error({ event: 'postgres_pool_error', error: err.message });
  });
  return pool;
}

function requirePool(context: string): Pool | null {
  const active = getPool();
  if (!active) {
    logger.warn(`PostgreSQL pool not configured; skipping ${context}`);
    return null;
  }
  return active;
}

export async function savePaymentRecord(record: {
  userId: string;
  plan: string;
  duration: string;
  geideaSessionId: string;
  status: string;
  createdAt: Date;
}): Promise<void> {
  const pool = requirePool('savePaymentRecord');
  if (!pool) return;
  const query = `
    INSERT INTO payments (user_id, plan, duration, geidea_session_id, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [
    record.userId,
    record.plan,
    record.duration,
    record.geideaSessionId,
    record.status,
    record.createdAt,
  ];
  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error({ err }, 'Error inserting payment into PostgreSQL');
  }
}

export async function updatePaymentStatus(sessionId: string, status: string): Promise<void> {
  const pool = requirePool('updatePaymentStatus');
  if (!pool) return;
  const query = `UPDATE payments SET status = $1 WHERE geidea_session_id = $2`;
  try {
    await pool.query(query, [status, sessionId]);
  } catch (err) {
    logger.error({ err }, 'Error updating payment status in PostgreSQL');
  }
}

export async function saveDonationRecord(record: {
  wishId: string;
  geideaSessionId: string;
  donorEmail: string;
  donorName?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}): Promise<void> {
  const pool = requirePool('saveDonationRecord');
  if (!pool) return;
  const query = `
    INSERT INTO donations (wish_id, geidea_session_id, donor_email, donor_name, amount, currency, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  const values = [
    record.wishId,
    record.geideaSessionId,
    record.donorEmail,
    record.donorName || null,
    record.amount,
    record.currency,
    record.status,
    record.createdAt,
  ];
  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error({ err }, 'Error inserting donation into PostgreSQL');
  }
}

export async function updateDonationStatus(sessionId: string, status: string): Promise<void> {
  const pool = requirePool('updateDonationStatus');
  if (!pool) return;
  const query = `UPDATE donations SET status = $1 WHERE geidea_session_id = $2`;
  try {
    await pool.query(query, [status, sessionId]);
  } catch (err) {
    logger.error({ err }, 'Error updating donation status in PostgreSQL');
  }
}
