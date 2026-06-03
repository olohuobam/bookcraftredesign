-- Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC so they are
-- not reachable via PostgREST (/rest/v1/rpc/*) by anon or authenticated
-- roles. Trigger contexts and service_role retain access through their
-- own grants visible in pg_proc.proacl.
--
-- handle_new_user / create_default_shelves: triggers on auth.users
-- handle_successful_payment: server-only payment helper
-- update_updated_at: trigger function
-- upsert_reading_position: called via supabaseAdmin (service_role only)

REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_default_shelves()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_successful_payment(text, text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_reading_position(uuid, uuid, integer, integer, double precision) FROM PUBLIC;
