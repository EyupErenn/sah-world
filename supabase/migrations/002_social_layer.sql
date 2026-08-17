-- ============================================================
-- SAH WORLD — Migration 002: Social Layer
-- Arkadaşlık sistemi + 1-on-1 mesajlaşma.
-- 001_core_schema.sql'den SONRA çalıştırın.
-- ============================================================

-- ============================================================
-- TABLE: friendships
-- Çift yönlü arkadaşlık: user_id isteği gönderir, friend_id alır.
-- Kabul edilince status = 'accepted'.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Aynı yönde çift istek engellenir; A→B ve B→A farklı satırlardır
  CONSTRAINT friendships_unique_pair UNIQUE (user_id, friend_id),
  -- Kendi kendine arkadaşlık engeli
  CONSTRAINT friendships_no_self CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_id    ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id  ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS friendships_status     ON public.friendships(status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Kendi gönderdiği ve gelen istekleri okuyabilir
CREATE POLICY "friendship_select"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Sadece isteği gönderen kişi oluşturabilir
CREATE POLICY "friendship_insert"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Durumu güncelleyebilir: kabul/red için friend_id, iptal için user_id
CREATE POLICY "friendship_update"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = friend_id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = friend_id OR auth.uid() = user_id);

-- Her iki taraf da silebilir (arkadaşlığı bitirme / isteği geri çekme)
CREATE POLICY "friendship_delete"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================
-- TABLE: chat_messages
-- 1-on-1 DM. Supabase Realtime postgres_changes ile anlık.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Kendi kendine mesaj engeli
  CONSTRAINT chat_no_self CHECK (sender_id <> receiver_id)
);

-- Konuşma sırası için compound index
CREATE INDEX IF NOT EXISTS chat_messages_conversation ON public.chat_messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);
CREATE INDEX IF NOT EXISTS chat_messages_receiver_unread ON public.chat_messages(receiver_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Konuşmanın tarafları okuyabilir (sadece arkadaş olanlar)
-- Not: Arkadaşlık kontrolü uygulama katmanında yapılır; DB seviyesinde
-- sender veya receiver olma yeterli (zaten onlar mesaj oluşturur).
CREATE POLICY "chat_select"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Sadece gönderen oluşturabilir
CREATE POLICY "chat_insert"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Sadece alıcı is_read güncelleyebilir
CREATE POLICY "chat_update"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- ============================================================
-- REALTIME: chat_messages tablosunu Realtime yayına aç
-- Supabase Dashboard > Database > Replication'da da aktif edilmeli.
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================================
-- HELPER FUNCTION: Arkadaş listesi ile mesaj önizlemesi (RPC)
-- Hem arkadaş listesini hem son mesajı tek sorguda çeker.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_friends_with_last_message(requesting_user UUID)
RETURNS TABLE (
  friend_id       UUID,
  display_name    TEXT,
  avatar_url      TEXT,
  xp              INTEGER,
  streak_current  INTEGER,
  friendship_id   UUID,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count    BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                                        AS friend_id,
    p.display_name,
    p.avatar_url,
    p.xp,
    p.streak_current,
    f.id                                        AS friendship_id,
    last_msg.content                            AS last_message,
    last_msg.created_at                         AS last_message_at,
    COALESCE(unread.cnt, 0)                     AS unread_count
  FROM public.friendships f
  JOIN public.profiles p ON (
    CASE
      WHEN f.user_id = requesting_user THEN f.friend_id
      ELSE f.user_id
    END = p.id
  )
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM public.chat_messages
    WHERE
      (sender_id = requesting_user AND receiver_id = p.id) OR
      (sender_id = p.id AND receiver_id = requesting_user)
    ORDER BY created_at DESC
    LIMIT 1
  ) last_msg ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.chat_messages
    WHERE sender_id = p.id AND receiver_id = requesting_user AND is_read = FALSE
  ) unread ON TRUE
  WHERE
    (f.user_id = requesting_user OR f.friend_id = requesting_user)
    AND f.status = 'accepted'
  ORDER BY last_msg.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_friends_with_last_message(UUID) TO authenticated;

-- ============================================================
-- HELPER FUNCTION: display_name'e göre kullanıcı arama (arkadaş eklemek için)
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_term TEXT, requesting_user UUID)
RETURNS TABLE (
  id            UUID,
  display_name  TEXT,
  avatar_url    TEXT,
  xp            INTEGER,
  streak_current INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.xp,
    p.streak_current
  FROM public.profiles p
  WHERE
    p.id <> requesting_user
    AND p.display_name ILIKE '%' || search_term || '%'
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.search_users_by_name(TEXT, UUID) TO authenticated;
