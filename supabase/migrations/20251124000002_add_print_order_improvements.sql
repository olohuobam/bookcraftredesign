-- Migration: Add Print Order Improvements
-- Features: Saved Addresses, Quantity, Tracking Numbers
-- Date: 2025-01-11

-- 1. Create saved_addresses table for address book feature
CREATE TABLE IF NOT EXISTS saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., "Home", "Office", "Parents"
  name TEXT NOT NULL,
  street1 TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  state_code TEXT,
  country_code TEXT NOT NULL,
  postcode TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id ON saved_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_addresses_default ON saved_addresses(user_id, is_default) WHERE is_default = TRUE;

-- 2. Add new columns to print_jobs table
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ;

-- 3. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Add triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_saved_addresses_updated_at ON saved_addresses;
CREATE TRIGGER update_saved_addresses_updated_at
  BEFORE UPDATE ON saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Add Row Level Security (RLS) policies for saved_addresses
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own addresses
CREATE POLICY "Users can view their own addresses" ON saved_addresses
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own addresses
CREATE POLICY "Users can insert their own addresses" ON saved_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own addresses
CREATE POLICY "Users can update their own addresses" ON saved_addresses
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses" ON saved_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Add indexes for print_jobs tracking fields
CREATE INDEX IF NOT EXISTS idx_print_jobs_tracking ON print_jobs(tracking_number) WHERE tracking_number IS NOT NULL;

-- 7. Add comments for documentation
COMMENT ON TABLE saved_addresses IS 'Stores user saved shipping addresses for quick reordering';
COMMENT ON COLUMN print_jobs.quantity IS 'Number of books ordered in this print job';
COMMENT ON COLUMN print_jobs.tracking_number IS 'Shipping tracking number from Lulu webhooks';
COMMENT ON COLUMN print_jobs.tracking_url IS 'Full tracking URL for carrier website';
COMMENT ON COLUMN print_jobs.carrier IS 'Shipping carrier name (e.g., USPS, UPS, DHL)';
COMMENT ON COLUMN print_jobs.estimated_delivery_date IS 'Expected delivery date from carrier';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully! Print order improvements added.';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Saved addresses table created';
  RAISE NOTICE '  - Print jobs extended with quantity and tracking fields';
  RAISE NOTICE '  - RLS policies configured';
END $$;
