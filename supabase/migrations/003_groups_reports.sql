-- SAH World — private communities, group chat, and an idempotent XP event ledger.
-- Run after 001_core_schema.sql and 002_social_layer.sql.

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 60),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 240),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL UNIQUE CHECK (group_code ~ '^[A-Z0-9]{6}$'),
  member_count INTEGER NOT NULL DEFAULT 1 CHECK (member_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS groups_owner_idx ON public.groups(owner_id);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON public.group_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON public.group_members(group_id, joined_at);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helpers avoid recursive RLS evaluation on group_members.
CREATE OR REPLACE FUNCTION public.is_group_member(target_group UUID, target_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = target_group AND user_id = target_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(target_group UUID, target_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = target_group AND owner_id = target_user
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_owner(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(UUID, UUID) TO authenticated;

CREATE POLICY groups_member_select ON public.groups FOR SELECT
  USING (public.is_group_member(id));
CREATE POLICY groups_owner_update ON public.groups FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY groups_owner_delete ON public.groups FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY group_members_member_select ON public.group_members FOR SELECT
  USING (public.is_group_member(group_id));
CREATE POLICY group_members_self_leave ON public.group_members FOR DELETE
  USING (user_id = auth.uid() AND role = 'member');
CREATE POLICY group_members_owner_remove ON public.group_members FOR DELETE
  USING (public.is_group_owner(group_id) AND role <> 'owner');

CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE generated TEXT;
BEGIN
  LOOP
    generated := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE group_code = generated);
  END LOOP;
  RETURN generated;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group(group_name TEXT, group_description TEXT DEFAULT '')
RETURNS public.groups LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_group public.groups;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;
  IF char_length(trim(group_name)) NOT BETWEEN 2 AND 60 THEN RAISE EXCEPTION 'Grup adı 2-60 karakter olmalı'; END IF;
  INSERT INTO public.groups (name, description, owner_id, group_code)
  VALUES (trim(group_name), left(trim(coalesce(group_description, '')), 240), auth.uid(), public.generate_group_code())
  RETURNING * INTO created_group;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (created_group.id, auth.uid(), 'owner');
  RETURN created_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_group_by_code(lookup_code TEXT)
RETURNS TABLE (id UUID, name TEXT, description TEXT, group_code TEXT, member_count INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, g.group_code, g.member_count
  FROM public.groups g WHERE g.group_code = upper(trim(lookup_code));
$$;

CREATE OR REPLACE FUNCTION public.join_group_by_code(join_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Oturum gerekli'; END IF;
  SELECT id INTO target_id FROM public.groups WHERE group_code = upper(trim(join_code));
  IF target_id IS NULL THEN RAISE EXCEPTION 'Grup bulunamadı'; END IF;
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (target_id, auth.uid(), 'member') ON CONFLICT (group_id, user_id) DO NOTHING;
  UPDATE public.groups SET member_count = (SELECT count(*) FROM public.group_members WHERE group_id = target_id), updated_at = now()
  WHERE id = target_id;
  RETURN target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_group_member_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target UUID := coalesce(NEW.group_id, OLD.group_id);
BEGIN
  UPDATE public.groups SET member_count = greatest(1, (SELECT count(*) FROM public.group_members WHERE group_id = target)), updated_at = now()
  WHERE id = target;
  RETURN coalesce(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS group_member_count_sync ON public.group_members;
CREATE TRIGGER group_member_count_sync AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.sync_group_member_count();

CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS SETOF public.groups LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.* FROM public.groups g JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid() ORDER BY gm.joined_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_group_roster(target_group_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, xp INTEGER, streak_current INTEGER, badges TEXT[], role TEXT, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_group_member(target_group_id) THEN RAISE EXCEPTION 'Bu grubun üyesi değilsiniz'; END IF;
  RETURN QUERY SELECT p.id, p.display_name, p.avatar_url, p.xp, p.streak_current, p.badges, gm.role, gm.joined_at
  FROM public.group_members gm JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = target_group_id ORDER BY p.xp DESC, gm.joined_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_group_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_roster(UUID) TO authenticated;

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_no_self;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_channel_exactly_one CHECK (
  (group_id IS NOT NULL AND receiver_id IS NULL) OR
  (group_id IS NULL AND receiver_id IS NOT NULL AND sender_id <> receiver_id)
);
CREATE INDEX IF NOT EXISTS chat_messages_group_created_idx ON public.chat_messages(group_id, created_at DESC) WHERE group_id IS NOT NULL;

DROP POLICY IF EXISTS chat_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_update ON public.chat_messages;
CREATE POLICY chat_select ON public.chat_messages FOR SELECT USING (
  (group_id IS NULL AND (auth.uid() = sender_id OR auth.uid() = receiver_id)) OR
  (group_id IS NOT NULL AND public.is_group_member(group_id))
);
CREATE POLICY chat_insert ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    (group_id IS NULL AND receiver_id IS NOT NULL) OR
    (group_id IS NOT NULL AND receiver_id IS NULL AND public.is_group_member(group_id))
  )
);
CREATE POLICY chat_update ON public.chat_messages FOR UPDATE
  USING (group_id IS NULL AND auth.uid() = receiver_id)
  WITH CHECK (group_id IS NULL AND auth.uid() = receiver_id);

CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  xp_amount INTEGER NOT NULL CHECK (xp_amount BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS xp_events_user_created_idx ON public.xp_events(user_id, created_at DESC);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_select_own ON public.xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY xp_events_insert_own ON public.xp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
