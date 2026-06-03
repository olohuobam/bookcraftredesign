-- Enable Row Level Security on print_jobs.
-- Service role bypasses RLS automatically (used by API routes via supabaseAdmin),
-- so writes happen through the trusted server. Authenticated end-users may
-- only SELECT their own print jobs; INSERT/UPDATE/DELETE are denied at the
-- table level (no matching policy) for the authenticated and anon roles.

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "print_jobs_select_own" ON public.print_jobs;
CREATE POLICY "print_jobs_select_own"
  ON public.print_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
