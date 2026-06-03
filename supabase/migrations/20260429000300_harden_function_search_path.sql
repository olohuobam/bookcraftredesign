-- Pin search_path on functions flagged by the linter
-- (function_search_path_mutable). Setting search_path makes function
-- behavior deterministic and prevents search-path-based privilege
-- escalation for any current or future SECURITY DEFINER usage.

ALTER FUNCTION public.update_iap_purchases_updated_at()           SET search_path = public, pg_temp;
ALTER FUNCTION public.update_bookmark_updated_at()                SET search_path = public, pg_temp;
ALTER FUNCTION public.update_subscriptions_updated_at()           SET search_path = public, pg_temp;
ALTER FUNCTION public.update_library_shelves_updated_at()         SET search_path = public, pg_temp;
ALTER FUNCTION public.update_media_library_updated_at()           SET search_path = public, pg_temp;
ALTER FUNCTION public.update_book_generation_jobs_updated_at()    SET search_path = public, pg_temp;
ALTER FUNCTION public.debit_credits(text, integer, text)          SET search_path = public, pg_temp;
ALTER FUNCTION public.get_stale_book_generation_jobs(integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_reading_position(uuid, uuid, integer, integer, double precision) SET search_path = public, pg_temp;
