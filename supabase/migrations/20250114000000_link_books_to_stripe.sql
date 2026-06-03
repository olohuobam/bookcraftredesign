-- Migration: Link books table to Stripe Foreign Tables
-- Purpose: Enable digital purchase tracking with Stripe Payment Intent references
-- The detailed payment data lives in stripe_payment_intents (foreign table)

-- Add minimal Stripe references to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_books_stripe_payment_intent 
ON public.books(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

-- Add index for purchased books
CREATE INDEX IF NOT EXISTS idx_books_purchased 
ON public.books(user_id, purchased) 
WHERE purchased = true;

-- Add comments for documentation
COMMENT ON COLUMN public.books.stripe_payment_intent_id IS 
  'Reference to stripe_payment_intents.id (foreign table). Use this to join with Stripe data.';

COMMENT ON COLUMN public.books.purchased_at IS 
  'Timestamp when the book was purchased (digital or bundle).';
