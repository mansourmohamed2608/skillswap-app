CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  wish_id TEXT NOT NULL,
  geidea_session_id TEXT UNIQUE NOT NULL,
  donor_email TEXT NOT NULL,
  donor_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
