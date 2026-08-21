-- SAH World — Google Auth profile compatibility + professional feedback system
-- Google provider credentials and redirect URLs are configured in external dashboards;
-- this migration owns only application data, authorization and server-side rate limits.

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE)
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'bug', 'usability', 'content', 'performance', 'other')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 20 AND 4000),
  rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  page_path TEXT NOT NULL DEFAULT '/' CHECK (
    char_length(page_path) BETWEEN 1 AND 200
    AND left(page_path, 1) = '/'
    AND position('?' IN page_path) = 0
    AND position('#' IN page_path) = 0
  ),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'planned', 'completed', 'closed')),
  admin_response TEXT CHECK (admin_response IS NULL OR char_length(btrim(admin_response)) <= 4000),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_created_idx ON public.feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_created_idx ON public.feedback (status, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS feedback_type_created_idx ON public.feedback (type, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_rating_idx ON public.feedback (rating) WHERE rating IS NOT NULL;

DROP TRIGGER IF EXISTS feedback_updated_at ON public.feedback;
CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select_own_or_admin ON public.feedback;
CREATE POLICY feedback_select_own_or_admin
  ON public.feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin());

-- Intentionally no direct INSERT policy. Submissions must pass through
-- submit_feedback(), which owns validation, user binding and rate limiting.
DROP POLICY IF EXISTS feedback_admin_update ON public.feedback;
CREATE POLICY feedback_admin_update
  ON public.feedback FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE OR REPLACE FUNCTION public.submit_feedback(
  feedback_type TEXT,
  feedback_title TEXT,
  feedback_message TEXT,
  feedback_rating SMALLINT DEFAULT NULL,
  feedback_page_path TEXT DEFAULT '/'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_id UUID;
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = 'P0001'; END IF;
  IF feedback_type NOT IN ('suggestion', 'bug', 'usability', 'content', 'performance', 'other') THEN RAISE EXCEPTION 'INVALID_TYPE' USING ERRCODE = 'P0001'; END IF;
  IF char_length(btrim(feedback_title)) NOT BETWEEN 5 AND 120 THEN RAISE EXCEPTION 'INVALID_TITLE' USING ERRCODE = 'P0001'; END IF;
  IF char_length(btrim(feedback_message)) NOT BETWEEN 20 AND 4000 THEN RAISE EXCEPTION 'INVALID_MESSAGE' USING ERRCODE = 'P0001'; END IF;
  IF feedback_rating IS NOT NULL AND feedback_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'INVALID_RATING' USING ERRCODE = 'P0001'; END IF;
  IF feedback_page_path IS NULL OR char_length(feedback_page_path) NOT BETWEEN 1 AND 200
     OR left(feedback_page_path, 1) <> '/' OR position('?' IN feedback_page_path) > 0 OR position('#' IN feedback_page_path) > 0 THEN
    RAISE EXCEPTION 'INVALID_PATH' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.feedback WHERE user_id = current_user_id AND created_at > now() - interval '10 seconds')
     OR (SELECT count(*) FROM public.feedback WHERE user_id = current_user_id AND created_at > now() - interval '10 minutes') >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.feedback (user_id, type, title, message, rating, page_path)
  VALUES (current_user_id, feedback_type, btrim(feedback_title), btrim(feedback_message), feedback_rating, feedback_page_path)
  RETURNING id INTO created_id;
  RETURN created_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, SMALLINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(TEXT, TEXT, TEXT, SMALLINT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_feedback_stats()
RETURNS TABLE(total_count BIGINT, received_count BIGINT, reviewing_count BIGINT, planned_count BIGINT, completed_count BIGINT, average_rating NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = 'P0001'; END IF;
  RETURN QUERY SELECT
    count(*) FILTER (WHERE f.archived_at IS NULL),
    count(*) FILTER (WHERE f.status = 'received' AND f.archived_at IS NULL),
    count(*) FILTER (WHERE f.status = 'reviewing' AND f.archived_at IS NULL),
    count(*) FILTER (WHERE f.status = 'planned' AND f.archived_at IS NULL),
    count(*) FILTER (WHERE f.status = 'completed' AND f.archived_at IS NULL),
    round(avg(f.rating) FILTER (WHERE f.archived_at IS NULL), 2)
  FROM public.feedback f;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_feedback(
  filter_status TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  filter_rating SMALLINT DEFAULT NULL,
  search_text TEXT DEFAULT NULL,
  sort_order TEXT DEFAULT 'newest',
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20,
  include_archived BOOLEAN DEFAULT FALSE
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
    AND (search_text IS NULL OR btrim(search_text) = '' OR f.title ILIKE '%' || btrim(search_text) || '%' OR p.display_name ILIKE '%' || btrim(search_text) || '%')
  ORDER BY
    CASE WHEN sort_order = 'oldest' THEN f.created_at END ASC,
    CASE WHEN sort_order <> 'oldest' THEN f.created_at END DESC
  LIMIT page_size OFFSET ((page_number - 1) * page_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_feedback(
  target_id UUID,
  next_status TEXT,
  response_text TEXT DEFAULT NULL,
  archive_item BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED' USING ERRCODE = 'P0001'; END IF;
  IF next_status NOT IN ('received', 'reviewing', 'planned', 'completed', 'closed') THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = 'P0001'; END IF;
  IF response_text IS NOT NULL AND char_length(btrim(response_text)) > 4000 THEN RAISE EXCEPTION 'INVALID_RESPONSE' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.feedback SET
    status = next_status,
    admin_response = NULLIF(btrim(response_text), ''),
    reviewed_by = auth.uid(), reviewed_at = now(),
    archived_at = CASE WHEN archive_item THEN now() ELSE archived_at END
  WHERE id = target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_feedback_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_feedback(TEXT, TEXT, SMALLINT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_feedback(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_feedback_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_feedback(TEXT, TEXT, SMALLINT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_feedback(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON TABLE public.feedback IS 'User-owned product feedback. Direct inserts are disabled; submit_feedback RPC enforces identity and rate limits.';
COMMENT ON FUNCTION public.is_app_admin() IS 'Authorization uses auth.users raw_app_meta_data.role=admin, exposed in JWT app_metadata and not editable by users.';
