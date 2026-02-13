-- PostgreSQL schema for payments persistence used by savePaymentRecord/updatePaymentStatus
-- Run this once on your database (adjust schema/owner as needed)

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  duration TEXT NOT NULL,
  geidea_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
-- geidea_session_id is UNIQUE above and used by updatePaymentStatus

-- Optional: constrain status to known values (uncomment if you want strictness)
-- CREATE TYPE payment_status AS ENUM ('PENDING','SUCCESS','PAID','FAILED','CANCELED','UNKNOWN');
-- ALTER TABLE payments ALTER COLUMN status TYPE payment_status USING status::payment_status;
