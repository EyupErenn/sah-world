-- ============================================================
-- SAH WORLD — Migration 001: Core Schema
-- Supabase SQL Editor'da çalıştırın (sırayla).
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid() için

-- ============================================================
-- TABLE: profiles
-- auth.users ile 1-to-1 ilişki. Trigger ile otomatik oluşur.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT        NOT NULL DEFAULT 'Yolcu',
  avatar_url         TEXT,                                     -- DiceBear URL veya null
  vehicle_type       TEXT        NOT NULL DEFAULT 'car'
                                 CHECK (vehicle_type IN ('car','bike','horse','rocket')),
  xp                 INTEGER     NOT NULL DEFAULT 0 CHECK (xp >= 0),
  streak_current     INTEGER     NOT NULL DEFAULT 1 CHECK (streak_current >= 0),
  streak_last_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  badges             TEXT[]      NOT NULL DEFAULT '{}',
  total_zikir        INTEGER     NOT NULL DEFAULT 0 CHECK (total_zikir >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Yeni auth kullanıcısı oluşunca profiles satırı otomatik oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(COALESCE(NEW.email, NEW.phone, 'Yolcu'), '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING; -- idempotent
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Arkadaşların profil özetini okuma için güvenli VIEW
CREATE OR REPLACE VIEW public.public_profile_summary AS
  SELECT id, display_name, avatar_url, xp, streak_current, badges
  FROM public.profiles;

GRANT SELECT ON public.public_profile_summary TO authenticated;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLE: journal_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  mood       SMALLINT    CHECK (mood BETWEEN 1 AND 5),
  energy     SMALLINT    CHECK (energy BETWEEN 1 AND 10),
  stress     SMALLINT    CHECK (stress BETWEEN 1 AND 10),
  sleep      SMALLINT    CHECK (sleep BETWEEN 0 AND 24),
  content    TEXT        NOT NULL DEFAULT '',
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS journal_entries_user_date ON public.journal_entries(user_id, date DESC);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_select" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_insert" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_delete" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: quran_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quran_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  sure       TEXT        NOT NULL DEFAULT '',
  ayet       TEXT        NOT NULL DEFAULT '',
  tefsir     TEXT        NOT NULL DEFAULT '',
  ders       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quran_notes_user_date ON public.quran_notes(user_id, date DESC);
ALTER TABLE public.quran_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quran_select" ON public.quran_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quran_insert" ON public.quran_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quran_delete" ON public.quran_notes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: hadis_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hadis_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  metin      TEXT        NOT NULL DEFAULT '',
  kaynak     TEXT        NOT NULL DEFAULT '',
  konu       TEXT        NOT NULL DEFAULT '',
  uygulama   TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hadis_notes_user_date ON public.hadis_notes(user_id, date DESC);
ALTER TABLE public.hadis_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hadis_select" ON public.hadis_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hadis_insert" ON public.hadis_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hadis_delete" ON public.hadis_notes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: lesson_entries  (Hatalar bölümü)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_entries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  title      TEXT        NOT NULL DEFAULT '',
  wrong      TEXT        NOT NULL DEFAULT '',
  learned    TEXT        NOT NULL DEFAULT '',
  severity   SMALLINT    CHECK (severity BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lesson_entries_user_date ON public.lesson_entries(user_id, date DESC);
ALTER TABLE public.lesson_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_select" ON public.lesson_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lesson_insert" ON public.lesson_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_delete" ON public.lesson_entries FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: sukur_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sukur_entries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  text       TEXT        NOT NULL DEFAULT '',
  nimet1     TEXT        NOT NULL DEFAULT '',
  nimet2     TEXT        NOT NULL DEFAULT '',
  nimet3     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sukur_entries_user_date ON public.sukur_entries(user_id, date DESC);
ALTER TABLE public.sukur_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sukur_select" ON public.sukur_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sukur_insert" ON public.sukur_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sukur_delete" ON public.sukur_entries FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: eisenhower_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eisenhower_tasks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quadrant   TEXT        NOT NULL CHECK (quadrant IN ('q1','q2','q3','q4')),
  text       TEXT        NOT NULL DEFAULT '',
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS eisenhower_tasks_user ON public.eisenhower_tasks(user_id, quadrant);
ALTER TABLE public.eisenhower_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eisen_select" ON public.eisenhower_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "eisen_insert" ON public.eisenhower_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "eisen_update" ON public.eisenhower_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "eisen_delete" ON public.eisenhower_tasks FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: tespih_log  (günlük zikir sayaçları)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tespih_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER     NOT NULL DEFAULT 0 CHECK (count >= 0),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS tespih_log_user ON public.tespih_log(user_id, date DESC);
ALTER TABLE public.tespih_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tespih_select" ON public.tespih_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tespih_insert" ON public.tespih_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tespih_update" ON public.tespih_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tespih_delete" ON public.tespih_log FOR DELETE USING (auth.uid() = user_id);
