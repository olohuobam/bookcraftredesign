-- Migration: Enable RLS on delete_requests table
-- Prevents anon/authenticated users from reading or manipulating deletion tokens
-- Only service_role (used server-side) has access

ALTER TABLE delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delete_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE delete_requests FROM anon;
REVOKE ALL ON TABLE delete_requests FROM authenticated;

-- Idempotent: create service_role_full_access policy if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'delete_requests'
      AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access
      ON delete_requests
      AS PERMISSIVE
      FOR ALL
      TO service_role
      USING (true);
  END IF;
END;
$$;

-- Grant explicit DML privileges to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE delete_requests TO service_role;
