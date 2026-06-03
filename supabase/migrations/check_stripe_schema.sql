-- Quick check: Stripe Foreign Table Schema
-- Run this first to understand the structure

-- 1. Check stripe_payment_intents columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stripe_payment_intents'
ORDER BY ordinal_position;

-- 2. Sample data to see actual structure
SELECT *
FROM stripe_payment_intents
LIMIT 1;
