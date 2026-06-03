-- IAP Subscriptions Migration
-- Issue #368 — Native IAP for Subscriptions (iOS StoreKit + Android Play Billing)

-- 1. Ensure subscriptions table has IAP columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iap_provider TEXT CHECK (iap_provider IN ('ios', 'android'));
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iap_transaction_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iap_product_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS iap_original_transaction_id TEXT;

-- 2. Create iap_subscription_events table for tracking renewals & status changes
CREATE TABLE IF NOT EXISTS iap_subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('ios', 'android', 'unknown')),
  event_type TEXT NOT NULL CHECK (event_type IN ('subscribe', 'renew', 'cancel', 'restore', 'expire', 'billing_retry')),
  receipt_data TEXT,
  validation_response JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_iap_sub_events_user_id ON iap_subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_sub_events_transaction_id ON iap_subscription_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_iap_sub_events_original_tx ON iap_subscription_events(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_iap_tx ON subscriptions(iap_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_iap_orig_tx ON subscriptions(iap_original_transaction_id);

-- 4. RLS for iap_subscription_events
ALTER TABLE iap_subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "Users can view own IAP subscription events"
  ON iap_subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Fix 7: Only service_role can write/manage events (not open to all)
CREATE POLICY "Service role can manage IAP subscription events"
  ON iap_subscription_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Permissions
GRANT SELECT ON iap_subscription_events TO authenticated;
GRANT ALL ON iap_subscription_events TO service_role;
