-- Coupons table for discount system
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  min_purchase_cents INTEGER,
  applicable_to TEXT NOT NULL DEFAULT 'all' CHECK (applicable_to IN ('digital', 'print', 'bundle', 'all')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast coupon lookup by code
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code) WHERE active = true;

-- Function to increment coupon usage atomically
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add preferred_currency to user profiles if the column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_currency TEXT DEFAULT 'EUR';
  END IF;
END $$;

-- RLS policies for coupons (read-only for authenticated users, full access for service role)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage coupons" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role');
