-- Migration: Add Payment Integration for Print Orders
-- Requires: Stripe Payment Intent before Lulu order
-- Date: 2025-01-11

-- Add payment-related columns to print_jobs table
ALTER TABLE print_jobs
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS payment_amount INTEGER; -- Amount in cents

-- Add indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_print_jobs_payment_intent ON print_jobs(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_print_jobs_payment_status ON print_jobs(payment_status) WHERE payment_status IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN print_jobs.payment_intent_id IS 'Stripe Payment Intent ID - customer must pay before Lulu order';
COMMENT ON COLUMN print_jobs.payment_status IS 'Stripe payment status (e.g., succeeded, failed, pending)';
COMMENT ON COLUMN print_jobs.payment_amount IS 'Total payment amount in cents (includes Lulu cost + service fee)';

-- Optional: Create a view for financial reporting
CREATE OR REPLACE VIEW print_job_payments AS
SELECT
  pj.id,
  pj.user_id,
  pj.book_id,
  pj.lulu_print_job_id,
  pj.payment_intent_id,
  pj.payment_status,
  pj.payment_amount,
  pj.total_cost_incl_tax AS lulu_cost,
  pj.quantity,
  pj.created_at,
  CASE
    WHEN pj.payment_amount IS NOT NULL AND pj.total_cost_incl_tax IS NOT NULL
    THEN (pj.payment_amount - CAST(pj.total_cost_incl_tax AS INTEGER))
    ELSE NULL
  END AS service_fee_cents,
  b.title AS book_title,
  u.email AS customer_email
FROM print_jobs pj
LEFT JOIN books b ON pj.book_id = b.id
LEFT JOIN users u ON pj.user_id = u.id
WHERE pj.payment_intent_id IS NOT NULL;

COMMENT ON VIEW print_job_payments IS 'Financial view of print orders with payment details and profit margins';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Payment integration migration completed!';
  RAISE NOTICE 'New features:';
  RAISE NOTICE '  - Payment tracking with Stripe Payment Intents';
  RAISE NOTICE '  - Service fee calculation capability';
  RAISE NOTICE '  - Financial reporting view created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Configure STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY';
  RAISE NOTICE '  2. Set up Stripe webhook for payment confirmations';
  RAISE NOTICE '  3. Update frontend to use /api/print-payment for checkout';
END $$;
