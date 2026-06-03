-- In-App Purchase Tables Migration
-- Run this in your Supabase SQL Editor

-- 1. Create IAP Purchases Table
CREATE TABLE IF NOT EXISTS iap_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('android', 'ios')),
  receipt_data TEXT,
  validation_response JSONB,
  credits_granted INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_iap_purchases_user_id ON iap_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_transaction_id ON iap_purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_iap_purchases_status ON iap_purchases(status);

-- 3. Add IAP-related columns to books table (if not exists)
ALTER TABLE books ADD COLUMN IF NOT EXISTS iap_purchase_id UUID REFERENCES iap_purchases(id);
ALTER TABLE books ADD COLUMN IF NOT EXISTS iap_provider TEXT;

-- 4. Enable RLS (Row Level Security)
ALTER TABLE iap_purchases ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for iap_purchases
CREATE POLICY "Users can view own IAP purchases"
  ON iap_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert IAP purchases"
  ON iap_purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update IAP purchases"
  ON iap_purchases FOR UPDATE
  USING (true);

-- 6. Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_iap_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger for updated_at
DROP TRIGGER IF EXISTS set_iap_purchases_updated_at ON iap_purchases;
CREATE TRIGGER set_iap_purchases_updated_at
  BEFORE UPDATE ON iap_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_iap_purchases_updated_at();

-- 8. Grant permissions
GRANT SELECT ON iap_purchases TO authenticated;
GRANT ALL ON iap_purchases TO service_role;
