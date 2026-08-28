-- SAH World — community activation and security hardening.
-- Keeps personal journal content private; community surfaces only public profile summaries.

CREATE INDEX IF NOT EXISTS groups_code_lookup_idx ON public.groups (group_code);
CREATE INDEX IF NOT EXISTS group_members_group_role_idx ON public.group_members (group_id, role);

-- Client-side updates may edit presentation fields, never ownership/security fields.
CREATE OR REPLACE FUNCTION public.protect_group_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin') AND (
    NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
    NEW.group_code IS DISTINCT FROM OLD.group_code OR
    NEW.member_count IS DISTINCT FROM OLD.member_count
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Güvenlik alanları doğrudan değiştirilemez';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_group_security_fields_trigger ON public.groups;
CREATE TRIGGER protect_group_security_fields_trigger
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.protect_group_security_fields();

CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated TEXT;
  random_bytes BYTEA;
  index_value INTEGER;
BEGIN
  LOOP
    generated := '';
    random_bytes := gen_random_bytes(6);
    FOR index_value IN 1..6 LOOP
      generated := generated || substr(alphabet, 1 + (get_byte(random_bytes, index_value - 1) % length(alphabet)), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE group_code = generated);
  END LOOP;
  RETURN generated;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group(group_name TEXT, group_description TEXT DEFAULT '')
RETURNS public.groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer UUID := auth.uid();
  cleaned_name TEXT := trim(coalesce(group_name, ''));
  cleaned_description TEXT := trim(coalesce(group_description, ''));
  created_group public.groups;
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Oturum gerekli';
  END IF;
  IF char_length(cleaned_name) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Grup adı 2-60 karakter olmalı';
  END IF;
  IF char_length(cleaned_description) > 240 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Açıklama en fazla 240 karakter olabilir';
  END IF;
  IF (SELECT count(*) FROM public.group_members WHERE user_id = viewer) >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'En fazla 10 topluluğa katılabilirsiniz';
  END IF;
  IF (SELECT count(*) FROM public.groups WHERE owner_id = viewer AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Kısa sürede çok fazla topluluk oluşturdunuz';
  END IF;

  INSERT INTO public.groups (name, description, owner_id, group_code)
  VALUES (cleaned_name, cleaned_description, viewer, public.generate_group_code())
  RETURNING * INTO created_group;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (created_group.id, viewer, 'owner');

  SELECT * INTO created_group FROM public.groups WHERE id = created_group.id;
  RETURN created_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_group_by_code(lookup_code TEXT)
RETURNS TABLE (id UUID, name TEXT, description TEXT, group_code TEXT, member_count INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer UUID := auth.uid();
  cleaned_code TEXT := upper(trim(coalesce(lookup_code, '')));
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Oturum gerekli';
  END IF;
  IF cleaned_code !~ '^[A-Z0-9]{6}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT g.id, g.name, g.description, g.group_code, g.member_count
  FROM public.groups g
  WHERE g.group_code = cleaned_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group_by_code(join_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer UUID := auth.uid();
  cleaned_code TEXT := upper(trim(coalesce(join_code, '')));
  target_id UUID;
  current_members INTEGER;
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Oturum gerekli';
  END IF;
  IF cleaned_code !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Geçerli bir davet kodu girin';
  END IF;
  IF (SELECT count(*) FROM public.group_members WHERE user_id = viewer) >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'En fazla 10 topluluğa katılabilirsiniz';
  END IF;

  SELECT g.id INTO target_id
  FROM public.groups g
  WHERE g.group_code = cleaned_code
  FOR UPDATE;

  IF target_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Bu kodla eşleşen topluluk bulunamadı';
  END IF;
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = target_id AND user_id = viewer) THEN
    RETURN target_id;
  END IF;

  SELECT count(*) INTO current_members FROM public.group_members WHERE group_id = target_id;
  IF current_members >= 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Bu topluluk üye sınırına ulaştı';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (target_id, viewer, 'member');
  RETURN target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS SETOF public.groups
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Oturum gerekli';
  END IF;
  RETURN QUERY
  SELECT g.*
  FROM public.groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY gm.joined_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_roster(target_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  xp INTEGER,
  streak_current INTEGER,
  badges TEXT[],
  role TEXT,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_group_member(target_group_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Bu topluluğa erişim izniniz yok';
  END IF;
  RETURN QUERY
  SELECT p.id, p.display_name, p.avatar_url, p.xp, p.streak_current, p.badges, gm.role, gm.joined_at
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = target_group_id
  ORDER BY p.xp DESC, gm.joined_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_group(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE viewer UUID := auth.uid();
BEGIN
  IF viewer IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Oturum gerekli';
  END IF;
  IF public.is_group_owner(target_group_id, viewer) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Kurucu topluluktan ayrılamaz; önce topluluğu silmelidir';
  END IF;
  DELETE FROM public.group_members WHERE group_id = target_group_id AND user_id = viewer;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_group(target_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_group_owner(target_group_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Yalnızca topluluk kurucusu bu işlemi yapabilir';
  END IF;
  DELETE FROM public.groups WHERE id = target_group_id AND owner_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_group_code(target_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_code TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_group_owner(target_group_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Yalnızca topluluk kurucusu davet kodunu yenileyebilir';
  END IF;
  new_code := public.generate_group_code();
  UPDATE public.groups SET group_code = new_code, updated_at = now() WHERE id = target_group_id;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_group_message(target_group_id UUID, message_content TEXT)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer UUID := auth.uid();
  cleaned_content TEXT := trim(coalesce(message_content, ''));
  created_message public.chat_messages;
BEGIN
  IF viewer IS NULL OR NOT public.is_group_member(target_group_id, viewer) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Bu topluluğa mesaj gönderme izniniz yok';
  END IF;
  IF char_length(cleaned_content) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Mesaj 1-2000 karakter olmalı';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE group_id = target_group_id AND sender_id = viewer AND created_at > now() - interval '1 second'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Mesajları çok hızlı gönderiyorsunuz';
  END IF;
  INSERT INTO public.chat_messages (sender_id, receiver_id, group_id, content, is_read)
  VALUES (viewer, NULL, target_group_id, cleaned_content, FALSE)
  RETURNING * INTO created_message;
  RETURN created_message;
END;
$$;

-- SECURITY DEFINER functions are never callable through the anonymous API.
REVOKE ALL ON FUNCTION public.generate_group_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_group(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.preview_group_by_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_group_by_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_groups() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_group_roster(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_group(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_group(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rotate_group_code(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_group_message(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_group_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_roster(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_group_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_group_message(UUID, TEXT) TO authenticated;

-- Force PostgREST to see the repaired RPC surface immediately after deployment.
NOTIFY pgrst, 'reload schema';
