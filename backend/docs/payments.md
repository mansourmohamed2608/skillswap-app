# Payments persistence (PostgreSQL)

The backend will persist subscription payments to Postgres so you can run analytics and reconcile with Geidea.

## Functions in code
- `savePaymentRecord(record)`: Inserts a row when a checkout session is created.
- `updatePaymentStatus(sessionId, status)`: Updates the row when Geidea webhook reports a new status.

Both are implemented in `backend/src/postgres.ts`. They are no-ops if a Postgres pool isn't configured.

## Table schema
See `payments.sql` for a ready-to-run schema:

- `geidea_session_id` is UNIQUE and used for updates.
- `status` stores raw gateway statuses (e.g., PENDING, SUCCESS/PAID, FAILED...).
- `created_at`, `updated_at` timestamps allow timeline views.

## Configure Postgres

Set the connection string either via environment variable or Firebase Functions config:

- Env var:
  - `POSTGRES_CONNECTION_STRING="postgres://user:pass@host:5432/dbname?sslmode=require"`
- Firebase Functions Config:
  - `firebase functions:config:set postgres.connection_string="postgres://..."`

If your provider requires SSL, include `sslmode=require` in the connection string.

## How it is used today

- On subscription session creation (mock or real), we call `savePaymentRecord(...)` with status `PENDING`.
- On webhook (or mock complete), we call `updatePaymentStatus(sessionId, newStatus)` and, on SUCCESS/PAID, grant membership in Firestore.

## Local dev and mock payments

With mock payments, you don't need a running Postgres. The functions will log a warning and skip inserts/updates. To enable mock payments:

- Environment variable: `USE_MOCK_PAYMENTS=1`
- Or Functions config: `firebase functions:config:set payments.use_mock=1`

## Testing end-to-end (optional)

1. Ensure your DB has the `payments` table (`payments.sql`).
2. Set `POSTGRES_CONNECTION_STRING` before starting the emulator.
3. Create a session via the frontend Pricing page.
4. Trigger mock completion:
   - The frontend calls `/payments/mock-complete` with the `sessionId` from the URL.
   - This updates Firestore and Postgres (`updatePaymentStatus`) and grants membership.

## Production notes

- When you switch to Geidea, set:
  - `geidea.merchant_id`, `geidea.api_password`, `geidea.callback_url`, and optional `geidea.base_url` via `firebase functions:config:set`.
- Keep returning HTTP 403 from business-logic endpoints for membership/limit violations to keep frontend UX consistent.
