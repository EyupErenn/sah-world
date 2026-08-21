-- Add bounded date filtering to the existing protected feedback admin query.

DROP FUNCTION IF EXISTS public.admin_list_feedback(TEXT, TEXT, SMALLINT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN);

CREATE FUNCTION public.admin_list_feedback(
  filter_status TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  filter_rating SMALLINT DEFAULT NULL,
  search_text TEXT DEFAULT NULL,
  sort_order TEXT DEFAULT 'newest',
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  include_archived BOOLEAN DEFAULT FALSE,
  filter_from DATE DEFAULT NULL,
  filter_to DATE DEFAULT NULL
)
RETURNS TABLE(
  id UUID, user_id UUID, display_name TEXT, avatar_url TEXT, type TEXT, title TEXT,
  message TEXT, rating SMALLINT, page_path TEXT, status TEXT, admin_response TEXT,
  reviewed_at TIMESTAMPTZ, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = 'P0001'; END IF;
  IF page_number < 1 OR page_size NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'INVALID_PAGINATION' USING ERRCODE = 'P0001'; END IF;
  IF filter_from IS NOT NULL AND filter_to IS NOT NULL AND filter_from > filter_to THEN RAISE EXCEPTION 'INVALID_DATE_RANGE' USING ERRCODE = 'P0001'; END IF;

  RETURN QUERY
  SELECT f.id, f.user_id, p.display_name, p.avatar_url, f.type, f.title, f.message, f.rating,
    f.page_path, f.status, f.admin_response, f.reviewed_at, f.archived_at, f.created_at, f.updated_at,
    count(*) OVER() AS total_count
  FROM public.feedback f
  JOIN public.profiles p ON p.id = f.user_id
  WHERE (include_archived OR f.archived_at IS NULL)
    AND (filter_status IS NULL OR filter_status = '' OR f.status = filter_status)
    AND (filter_type IS NULL OR filter_type = '' OR f.type = filter_type)
    AND (filter_rating IS NULL OR f.rating = filter_rating)
    AND (filter_from IS NULL OR f.created_at >= filter_from::timestamptz)
    AND (filter_to IS NULL OR f.created_at < (filter_to + 1)::timestamptz)
    AND (search_text IS NULL OR btrim(search_text) = '' OR f.title ILIKE '%' || btrim(search_text) || '%' OR p.display_name ILIKE '%' || btrim(search_text) || '%')
  ORDER BY
    CASE WHEN sort_order = 'oldest' THEN f.created_at END ASC,
    CASE WHEN sort_order <> 'oldest' THEN f.created_at END DESC
  LIMIT page_size OFFSET ((page_number - 1) * page_size);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_feedback(TEXT, TEXT, SMALLINT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_feedback(TEXT, TEXT, SMALLINT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, DATE, DATE) TO authenticated;
