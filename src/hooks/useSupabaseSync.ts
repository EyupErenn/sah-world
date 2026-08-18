'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore, type ExportSchema, ensureUUID, isValidUUID } from '@/store/useJourneyStore';
import type { Profile } from '@/lib/supabase';
import type { JournalEntry, QuranNote, HadisNote, EisenhowerTask, LessonEntry, SukurEntry } from '@/types';

// ============================================================
// Migration: localStorage → Supabase (bir kez çalışır)
// ============================================================
async function migrateLocalStorageToSupabase(userId: string) {
  const flag = localStorage.getItem('sah-migration-done');
  if (flag) return; // Zaten herhangi bir hesap için yapıldıysa bir daha asla çalıştırma

  const raw = localStorage.getItem('sah-world-store');
  if (!raw) {
    localStorage.setItem('sah-migration-done', 'completed');
    return;
  }

  try {
    const localData = (JSON.parse(raw) as { state: ExportSchema }).state;
    if (!localData) {
      localStorage.setItem('sah-migration-done', userId);
      return;
    }

    await supabase
      .from('profiles')
      .update({
        xp: localData.xp ?? 0,
        streak_current: localData.streak?.current ?? 1,
        streak_last_date: localData.streak?.lastDate ?? new Date().toISOString().split('T')[0],
        badges: localData.badges ?? [],
        vehicle_type: localData.vehicle?.type ?? 'car',
        total_zikir: localData.totalZikir ?? 0,
      })
      .eq('id', userId);

    if (localData.journal?.length) {
      await supabase.from('journal_entries').upsert(
        localData.journal.map((j) => ({
          id: ensureUUID(j.id),
          user_id: userId,
          date: j.date,
          mood: j.mood,
          energy: j.energy ?? 7,
          stress: j.stress ?? 3,
          sleep: j.sleep ?? null,
          content: j.content,
          tags: j.tags ?? [],
          created_at: j.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    if (localData.quranNotes?.length) {
      await supabase.from('quran_notes').upsert(
        localData.quranNotes.map((n) => ({
          id: ensureUUID(n.id),
          user_id: userId,
          date: n.date,
          sure: n.sure,
          ayet: n.ayet,
          tefsir: n.tefsir,
          ders: n.ders,
          created_at: n.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    if (localData.hadisNotes?.length) {
      await supabase.from('hadis_notes').upsert(
        localData.hadisNotes.map((n) => ({
          id: ensureUUID(n.id),
          user_id: userId,
          date: n.date,
          metin: n.metin,
          kaynak: n.kaynak,
          konu: n.konu,
          uygulama: n.uygulama,
          created_at: n.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    if (localData.lessons?.length) {
      await supabase.from('lesson_entries').upsert(
        localData.lessons.map((l) => ({
          id: ensureUUID(l.id),
          user_id: userId,
          date: l.date,
          title: l.title,
          wrong: l.wrong,
          learned: l.learned,
          severity: l.severity,
          created_at: l.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    if (localData.sukurList?.length) {
      await supabase.from('sukur_entries').upsert(
        localData.sukurList.map((s) => ({
          id: ensureUUID(s.id),
          user_id: userId,
          date: s.date,
          text: s.text,
          nimet1: s.nimets?.[0] ?? '',
          nimet2: s.nimets?.[1] ?? '',
          nimet3: s.nimets?.[2] ?? '',
          created_at: s.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    const allTasks = [
      ...(localData.eisenhower?.q1 ?? []).map((t) => ({ ...t, quadrant: 'q1' })),
      ...(localData.eisenhower?.q2 ?? []).map((t) => ({ ...t, quadrant: 'q2' })),
      ...(localData.eisenhower?.q3 ?? []).map((t) => ({ ...t, quadrant: 'q3' })),
      ...(localData.eisenhower?.q4 ?? []).map((t) => ({ ...t, quadrant: 'q4' })),
    ];
    if (allTasks.length) {
      await supabase.from('eisenhower_tasks').upsert(
        allTasks.map((t) => ({
          id: ensureUUID(t.id),
          user_id: userId,
          quadrant: t.quadrant,
          text: t.text,
          done: t.done,
          created_at: t.createdAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
    }

    localStorage.setItem('sah-migration-done', 'completed');
    console.info('[SAH Auth] localStorage → Supabase migrasyonu tamamlandı.');
  } catch (err) {
    console.warn('[SAH Auth] Migrasyon hatası (graceful degradation):', err);
  }
}

// ============================================================
// Main Hook: useSupabaseSync
// ============================================================
export function useSupabaseSync() {
  const { user, setProfile, setIsProfileLoading } = useAuthStore();
  const journeyStore = useJourneyStore();

  useEffect(() => {
    if (!user || !isValidUUID(user.id)) return;

    async function loadAllData() {
      setIsProfileLoading(true);
      try {
        // 1. Profil verisi çek (maybeSingle ile 406/PGRST116 hatasını önle)
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .maybeSingle();

        if (profileError) {
          console.warn('[SAH Sync] Profil sorgu hatası:', profileError);
        }

        // Eğer profil yoksa otomatik oluştur
        if (!profileData) {
          const fallbackProfile: Profile = {
            id: user!.id,
            display_name: user!.email ? user!.email.split('@')[0] : 'Yolcu',
            avatar_url: null,
            vehicle_type: 'car',
            xp: 0,
            streak_current: 1,
            streak_last_date: new Date().toISOString().split('T')[0],
            badges: [],
            total_zikir: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: createdProfile } = await supabase
            .from('profiles')
            .upsert(fallbackProfile)
            .select('*')
            .maybeSingle();

          profileData = createdProfile || fallbackProfile;
        }

        const profile = profileData as Profile;
        setProfile(profile);

        // 2. Tüm içerik tablolarını paralel çek
        const [
          { data: journalData },
          { data: quranData },
          { data: hadisData },
          { data: lessonData },
          { data: sukurData },
          { data: eisenhowerData },
        ] = await Promise.all([
          supabase.from('journal_entries').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
          supabase.from('quran_notes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
          supabase.from('hadis_notes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
          supabase.from('lesson_entries').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
          supabase.from('sukur_entries').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
          supabase.from('eisenhower_tasks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        ]);

        // Verileri dönüştür
        const journal: JournalEntry[] = (journalData || []).map((j) => ({
          id: j.id,
          date: j.date,
          mood: j.mood,
          energy: j.energy,
          stress: j.stress,
          sleep: j.sleep,
          content: j.content,
          tags: j.tags,
          createdAt: j.created_at,
        }));

        const quranNotes: QuranNote[] = (quranData || []).map((n) => ({
          id: n.id,
          date: n.date,
          sure: n.sure,
          ayet: n.ayet,
          tefsir: n.tefsir,
          ders: n.ders,
          createdAt: n.created_at,
        }));

        const hadisNotes: HadisNote[] = (hadisData || []).map((n) => ({
          id: n.id,
          date: n.date,
          metin: n.metin,
          kaynak: n.kaynak,
          konu: n.konu,
          uygulama: n.uygulama,
          createdAt: n.created_at,
        }));

        const lessons: LessonEntry[] = (lessonData || []).map((l) => ({
          id: l.id,
          date: l.date,
          title: l.title,
          wrong: l.wrong,
          learned: l.learned,
          severity: l.severity,
          createdAt: l.created_at,
        }));

        const sukurList: SukurEntry[] = (sukurData || []).map((s) => ({
          id: s.id,
          date: s.date,
          text: s.text,
          nimets: [s.nimet1, s.nimet2, s.nimet3],
          createdAt: s.created_at,
        }));

        const eisenhower = { q1: [] as EisenhowerTask[], q2: [] as EisenhowerTask[], q3: [] as EisenhowerTask[], q4: [] as EisenhowerTask[] };
        (eisenhowerData || []).forEach((t) => {
          const task = { id: t.id, text: t.text, done: t.done, createdAt: t.created_at };
          if (t.quadrant === 'q1') eisenhower.q1.push(task);
          else if (t.quadrant === 'q2') eisenhower.q2.push(task);
          else if (t.quadrant === 'q3') eisenhower.q3.push(task);
          else if (t.quadrant === 'q4') eisenhower.q4.push(task);
        });

        // 3. Zustand store'a DB verilerini yükle (importAll)
        journeyStore.importAll({
          xp: profile.xp ?? 0,
          badges: profile.badges ?? [],
          streak: { current: profile.streak_current ?? 1, lastDate: profile.streak_last_date ?? new Date().toISOString().split('T')[0] },
          totalZikir: profile.total_zikir ?? 0,
          vehicle: {
            type: (profile.vehicle_type || 'car') as 'car' | 'bike' | 'horse' | 'rocket',
            name: profile.vehicle_type || 'car',
            icon: '🚗',
            flavorText: '',
            color: '#6366f1',
          },
          journal,
          quranNotes,
          hadisNotes,
          lessons,
          sukurList,
          eisenhower,
        });

        // 4. Migrasyon kontrolü
        await migrateLocalStorageToSupabase(user!.id);

      } catch (err) {
        console.warn('[SAH Sync] Supabase veri çekme hatası (fallback to local):', err);
      } finally {
        setIsProfileLoading(false);
      }
    }

    loadAllData();
  }, [user?.id]);
}
