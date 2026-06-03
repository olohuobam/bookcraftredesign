-- Verifikationsskript für Digital Purchase Implementation
-- Führe diese Queries aus um die Integration zu testen

-- ==========================================
-- 1. PRÜFE SCHEMA-ÄNDERUNGEN
-- ==========================================

-- Prüfe ob neue Spalten existieren
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'books'
  AND column_name IN ('stripe_payment_intent_id', 'purchased_at');

-- Expected output:
-- stripe_payment_intent_id | text             | YES
-- purchased_at            | timestamp with time zone | YES

-- ==========================================
-- 2. PRÜFE INDEXES
-- ==========================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'books'
  AND indexname IN ('idx_books_stripe_payment_intent', 'idx_books_purchased');

-- Expected output:
-- idx_books_stripe_payment_intent | CREATE INDEX ... WHERE stripe_payment_intent_id IS NOT NULL
-- idx_books_purchased            | CREATE INDEX ... WHERE purchased = true

-- ==========================================
-- 3. PRÜFE FOREIGN TABLES
-- ==========================================

-- Liste alle Stripe Foreign Tables
SELECT 
  table_name, 
  table_type,
  (SELECT count(*) 
   FROM information_schema.columns c 
   WHERE c.table_name = t.table_name 
     AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'stripe%'
ORDER BY table_name;

-- Expected output:
-- stripe_charges           | FOREIGN TABLE | ~20 columns
-- stripe_customers         | FOREIGN TABLE | ~30 columns
-- stripe_invoices          | FOREIGN TABLE | ~40 columns
-- stripe_payment_intents   | FOREIGN TABLE | ~30 columns

-- ==========================================
-- 4. TEST FOREIGN TABLE ZUGRIFF
-- ==========================================

-- Prüfe ob stripe_payment_intents Daten hat
-- Note: Stripe Foreign Tables may have different column structure
-- Status might be in attrs JSONB field
SELECT 
  id,
  amount,
  currency,
  created,
  to_timestamp(created) as created_at,
  attrs->>'status' as status  -- Status from JSON attrs
FROM stripe_payment_intents 
ORDER BY created DESC 
LIMIT 5;

-- Falls leer: Normal wenn noch keine Payments gemacht wurden
-- Nach erstem Test-Payment sollten hier Daten erscheinen

-- ==========================================
-- 5. PRÜFE GEKAUFTE BÜCHER
-- ==========================================

-- Liste alle gekauften Bücher (ohne Payment Details)
SELECT 
  id,
  title,
  genre,
  purchased,
  purchased_at,
  stripe_payment_intent_id,
  created_at
FROM books
WHERE purchased = true
ORDER BY purchased_at DESC
LIMIT 10;

-- Falls leer: Normal wenn noch keine Purchases gemacht wurden

-- ==========================================
-- 6. FULL JOIN: Books + Stripe Payment Details
-- ==========================================

-- Liste gekaufte Bücher mit Payment Details
SELECT 
  b.id AS book_id,
  b.title,
  b.genre,
  b.purchased,
  b.purchased_at,
  b.user_id,
  -- Stripe Payment Details (status from JSON attrs)
  spi.id AS payment_intent_id,
  spi.amount / 100.0 AS amount_eur,
  spi.currency,
  spi.attrs->>'status' AS payment_status,  -- Extract from JSON
  to_timestamp(spi.created) AS stripe_created_at,
  spi.attrs->>'receipt_email' AS receipt_email  -- Extract from JSON
FROM books b
LEFT JOIN stripe_payment_intents spi 
  ON b.stripe_payment_intent_id = spi.id
WHERE b.purchased = true
ORDER BY b.purchased_at DESC
LIMIT 10;

-- Expected columns:
-- book_id | title | genre | purchased | purchased_at | user_id | 
-- payment_intent_id | amount_eur | currency | payment_status | 
-- stripe_created_at | receipt_email

-- ==========================================
-- 7. USER PAYMENT HISTORY
-- ==========================================

-- Zeige Payment History für einen User (ersetze USER_ID)
WITH user_purchases AS (
  SELECT 
    b.id,
    b.title,
    b.genre,
    b.purchased_at,
    b.stripe_payment_intent_id,
    spi.amount,
    spi.currency,
    spi.attrs->>'status' as status  -- Extract from JSON
  FROM books b
  LEFT JOIN stripe_payment_intents spi 
    ON b.stripe_payment_intent_id = spi.id
  WHERE b.user_id = 'YOUR_USER_ID_HERE'  -- ← ERSETZE MIT USER ID
    AND b.purchased = true
  ORDER BY b.purchased_at DESC
)
SELECT 
  id,
  title,
  genre,
  purchased_at,
  amount / 100.0 AS amount_eur,
  currency,
  status,
  stripe_payment_intent_id
FROM user_purchases;

-- ==========================================
-- 8. PAYMENT STATISTIKEN
-- ==========================================

-- Gesamt-Statistiken
SELECT 
  COUNT(*) AS total_purchases,
  COUNT(DISTINCT user_id) AS unique_customers,
  COUNT(DISTINCT stripe_payment_intent_id) AS unique_payments,
  SUM(CASE WHEN stripe_payment_intent_id IS NOT NULL THEN 1 ELSE 0 END) AS purchases_with_payment_intent,
  MIN(purchased_at) AS first_purchase,
  MAX(purchased_at) AS last_purchase
FROM books
WHERE purchased = true;

-- Revenue Statistiken (mit Stripe Join)
SELECT 
  COUNT(*) AS total_sales,
  SUM(spi.amount) / 100.0 AS total_revenue_eur,
  AVG(spi.amount) / 100.0 AS avg_order_value_eur,
  COUNT(DISTINCT b.user_id) AS unique_customers
FROM books b
INNER JOIN stripe_payment_intents spi 
  ON b.stripe_payment_intent_id = spi.id
WHERE b.purchased = true
  AND spi.attrs->>'status' = 'succeeded';  -- Extract from JSON

-- ==========================================
-- 9. PRÜFE WRAPPERS EXTENSION
-- ==========================================

-- Verifiziere dass Wrappers Extension aktiviert ist
SELECT 
  extname,
  extversion,
  extowner::regrole AS owner
FROM pg_extension 
WHERE extname = 'wrappers';

-- Expected output:
-- wrappers | 0.x.x | postgres

-- Liste alle Foreign Data Wrappers
SELECT 
  fdwname AS wrapper_name,
  fdwowner::regrole AS owner
FROM pg_foreign_data_wrapper
WHERE fdwname LIKE '%stripe%';

-- Expected output:
-- stripe_wrapper | postgres

-- ==========================================
-- 10. EXAMPLE: Test-Query für neuen Purchase
-- ==========================================

-- Simuliere was passiert nach einem Payment
-- (Nur für Verständnis - nicht ausführen!)

/*
-- Nach payment_intent.succeeded Webhook:
UPDATE books
SET 
  purchased = true,
  purchased_at = NOW(),
  stripe_payment_intent_id = 'pi_test_123456'
WHERE id = 'book-uuid-123'
  AND user_id = 'user-email@example.com';

-- Dann kannst du Payment Details abrufen:
SELECT 
  b.*,
  spi.amount,
  spi.currency,
  spi.status
FROM books b
LEFT JOIN stripe_payment_intents spi 
  ON b.stripe_payment_intent_id = spi.id
WHERE b.id = 'book-uuid-123';
*/

-- ==========================================
-- 11. CLEANUP: Test-Daten zurücksetzen (optional)
-- ==========================================

-- ⚠️ VORSICHT: Nur für Testing verwenden!
-- Setzt gekaufte Bücher zurück auf ungekauft

/*
UPDATE books
SET 
  purchased = false,
  purchased_at = NULL,
  stripe_payment_intent_id = NULL
WHERE id = 'YOUR_TEST_BOOK_ID';
*/

-- ==========================================
-- 12. PERFORMANCE-CHECK
-- ==========================================

-- Prüfe ob Indexes genutzt werden
EXPLAIN ANALYZE
SELECT *
FROM books
WHERE stripe_payment_intent_id = 'pi_test_123';

-- Expected: "Index Scan using idx_books_stripe_payment_intent"

EXPLAIN ANALYZE
SELECT *
FROM books
WHERE user_id = 'test-user'
  AND purchased = true;

-- Expected: "Index Scan using idx_books_purchased" (oder ähnlich)

-- ==========================================
-- ZUSAMMENFASSUNG
-- ==========================================

SELECT 
  'Schema Check' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'books' 
        AND column_name = 'stripe_payment_intent_id'
    ) THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END AS status
UNION ALL
SELECT 
  'Foreign Tables Check',
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = 'stripe_payment_intents' 
        AND table_type = 'FOREIGN TABLE'
    ) THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END
UNION ALL
SELECT 
  'Indexes Check',
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE indexname = 'idx_books_stripe_payment_intent'
    ) THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END
UNION ALL
SELECT 
  'Wrappers Extension Check',
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_extension 
      WHERE extname = 'wrappers'
    ) THEN '✅ PASSED'
    ELSE '⚠️ WARNING - Wrappers not installed'
  END;

-- ==========================================
-- END OF VERIFICATION SCRIPT
-- ==========================================

-- Nächste Schritte nach erfolgreicher Verifikation:
-- 1. Führe Migration aus (falls noch nicht geschehen)
-- 2. Konfiguriere Stripe Webhook
-- 3. Führe Test-Payment durch
-- 4. Prüfe Logs und Datenbank
-- 5. Verifiziere mit Query #6 (Full JOIN)
