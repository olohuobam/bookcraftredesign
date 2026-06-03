-- Atomic user-data deletion. All DELETE statements run in a single
-- transaction (the implicit one wrapping the function body), so a failure
-- mid-way rolls back every prior delete and leaves the user's data intact
-- for retry. Only the auth.users row is *not* deleted here — the calling
-- API route still does that via supabase.auth.admin.deleteUser, after this
-- function returns successfully.

CREATE OR REPLACE FUNCTION public.delete_user_account_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_book_ids UUID[];
  v_job_ids UUID[];
  v_subscription_ids UUID[];
  v_iap_purchase_ids UUID[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO v_book_ids
  FROM books WHERE user_id = p_user_id;

  IF array_length(v_book_ids, 1) IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), '{}') INTO v_job_ids
    FROM book_generation_jobs WHERE book_id = ANY(v_book_ids);

    IF array_length(v_job_ids, 1) IS NOT NULL THEN
      DELETE FROM book_images WHERE job_id = ANY(v_job_ids);
    END IF;

    DELETE FROM book_generation_jobs WHERE book_id = ANY(v_book_ids);
    DELETE FROM generated_images WHERE book_id = ANY(v_book_ids);
    DELETE FROM interaction_history WHERE book_id = ANY(v_book_ids);
    DELETE FROM interaction_points WHERE book_id = ANY(v_book_ids);
    DELETE FROM bookmarks WHERE book_id = ANY(v_book_ids);
    DELETE FROM book_category_configs WHERE book_id = ANY(v_book_ids);
    DELETE FROM book_scenes WHERE book_id = ANY(v_book_ids);

    SELECT COALESCE(array_agg(id), '{}') INTO v_iap_purchase_ids
    FROM iap_purchases WHERE book_id = ANY(v_book_ids);

    DELETE FROM print_jobs WHERE book_id = ANY(v_book_ids);

    IF array_length(v_iap_purchase_ids, 1) IS NOT NULL THEN
      DELETE FROM iap_purchases WHERE id = ANY(v_iap_purchase_ids);
    END IF;

    UPDATE books
       SET active_job_id = NULL, shelf_id = NULL, iap_purchase_id = NULL
     WHERE id = ANY(v_book_ids);

    DELETE FROM books WHERE id = ANY(v_book_ids);
  END IF;

  -- User-scoped tables
  DELETE FROM book_generation_jobs WHERE user_id = p_user_id;
  DELETE FROM print_jobs WHERE user_id = p_user_id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_subscription_ids
  FROM subscriptions WHERE user_id = p_user_id;

  IF array_length(v_subscription_ids, 1) IS NOT NULL THEN
    DELETE FROM iap_subscription_events WHERE subscription_id = ANY(v_subscription_ids);
    DELETE FROM subscriptions WHERE user_id = p_user_id;
  END IF;

  DELETE FROM library_shelves WHERE user_id = p_user_id;
  DELETE FROM media_library WHERE user_id = p_user_id;
  DELETE FROM payments WHERE user_id = p_user_id;
  DELETE FROM user_profiles WHERE user_id = p_user_id;
  DELETE FROM users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account_data(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account_data(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account_data(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account_data(UUID) TO service_role;
