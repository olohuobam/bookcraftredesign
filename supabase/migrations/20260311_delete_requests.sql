-- Delete Requests table for GDPR-compliant account deletion flow
-- Stores pending deletion tokens with 24h expiry

CREATE TABLE IF NOT EXISTS delete_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL,
  token      TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delete_requests_token_idx ON delete_requests(token);
CREATE INDEX IF NOT EXISTS delete_requests_email_idx ON delete_requests(email);

-- RLS and access policies are handled in migration 20260311120000_delete_requests_rls.sql
