import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  VehicleDef,
  JournalEntry,
  QuranNote,
  HadisNote,
  EisenhowerState,
  EisenhowerTask,
  LessonEntry,
  SukurEntry,
  StreakData,
} from '@/types';
import { VEHICLE_DEFS } from '@/lib/constants';

// ============================================================
// STORE STATE SHAPE
// ============================================================
interface JourneyState {
  // Vehicle
  vehicle: VehicleDef;
  vehicleChosen: boolean;

  // XP & Level
  xp: number;
  badges: string[];

  // Streak
  streak: StreakData;

  // Journal
  journal: JournalEntry[];

  // Quran
  quranNotes: QuranNote[];

  // Hadis
  hadisNotes: HadisNote[];

  // Eisenhower
  eisenhower: EisenhowerState;

  // Lessons
  lessons: LessonEntry[];

  // Sukur
  sukurList: SukurEntry[];

  // Mescidim
  totalZikir: number;
  currentTespih: number;

  // XP Orb trigger
  xpOrbTrigger: number;
  lastXPAmount: number;

  // ============================================================
  // ACTIONS
  // ============================================================
  setVehicle: (v: VehicleDef) => void;

  addXP: (amount: number) => void;
  unlockBadge: (id: string) => void;
  checkBadges: () => void;

  updateStreak: () => void;

  addJournal: (entry: JournalEntry) => void;
  deleteJournal: (id: string) => void;

  addQuranNote: (note: QuranNote) => void;
  deleteQuranNote: (id: string) => void;

  addHadisNote: (note: HadisNote) => void;
  deleteHadisNote: (id: string) => void;

  addTask: (qKey: keyof EisenhowerState, task: EisenhowerTask) => void;
  toggleTask: (qKey: keyof EisenhowerState, id: string) => void;
  deleteTask: (qKey: keyof EisenhowerState, id: string) => void;

  addLesson: (entry: LessonEntry) => void;
  deleteLesson: (id: string) => void;

  addSukur: (entry: SukurEntry) => void;
  deleteSukur: (id: string) => void;

  incrementTespih: () => void;
  resetTespih: () => void;

  resetStore: () => void;
  importAll: (data: Partial<ExportSchema>) => void;
  exportAll: () => ExportSchema;
}

// For JSON backup
export interface ExportSchema {
  xp: number;
  vehicle: VehicleDef;
  badges: string[];
  streak: StreakData;
  journal: JournalEntry[];
  quranNotes: QuranNote[];
  hadisNotes: HadisNote[];
  eisenhower: EisenhowerState;
  lessons: LessonEntry[];
  sukurList: SukurEntry[];
  totalZikir: number;
}

// ============================================================
// HELPER: Supabase Optimistic Sync & UUID Validator
// ============================================================
export function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function ensureUUID(id?: string): string {
  if (id && isValidUUID(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const storeUser = useAuthStore.getState().user || useAuthStore.getState().session?.user;
  if (storeUser?.id) return storeUser.id;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function notifySyncError(err: unknown, ctx: string) {
  console.error(`[Supabase Sync Error] ${ctx}:`, err);
}

// ============================================================
// STORE IMPLEMENTATION
// ============================================================
export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      // Defaults
      vehicle: VEHICLE_DEFS.car,
      vehicleChosen: false,
      xp: 0,
      badges: [],
      streak: { current: 1, lastDate: new Date().toISOString().split('T')[0] },
      journal: [],
      quranNotes: [],
      hadisNotes: [],
      eisenhower: { q1: [], q2: [], q3: [], q4: [] },
      lessons: [],
      sukurList: [],
      totalZikir: 0,
      currentTespih: 0,
      xpOrbTrigger: 0,
      lastXPAmount: 0,

      // Vehicle
      setVehicle: (v) => {
        set({ vehicle: v, vehicleChosen: true });
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('profiles').update({ vehicle_type: v.type }).eq('id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'setVehicle'); });
          }
        });
      },

      // XP
      addXP: (amount) => {
        set((s) => ({
          xp: s.xp + amount,
          xpOrbTrigger: s.xpOrbTrigger + 1,
          lastXPAmount: amount,
        }));
        get().checkBadges();

        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('profiles').update({ xp: get().xp }).eq('id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'addXP'); });
          }
        });
      },

      unlockBadge: (id) => {
        const earned = get().badges;
        if (!earned.includes(id)) {
          const next = [...earned, id];
          set({ badges: next });
          getAuthenticatedUserId().then((uid) => {
            if (uid) {
              supabase.from('profiles').update({ badges: next }).eq('id', uid)
                .then(({ error }) => { if (error) notifySyncError(error, 'unlockBadge'); });
            }
          });
        }
      },

      checkBadges: () => {
        const { xp, journal, quranNotes, hadisNotes, lessons, suukurList = get().sukurList, totalZikir, eisenhower, unlockBadge } = get() as any;
        const completedTasks = [...eisenhower.q1, ...eisenhower.q2, ...eisenhower.q3, ...eisenhower.q4].filter(t => t.done).length;

        if (xp > 0 || journal.length > 0 || suukurList.length > 0) unlockBadge('first_step');
        if (suukurList.length >= 20) unlockBadge('sukur_master');
        if (totalZikir >= 500) unlockBadge('zikir_master');
        if (quranNotes.length >= 10) unlockBadge('kuran_dostu');
        if (hadisNotes.length >= 10) unlockBadge('hadis_alimi');
        if (completedTasks >= 15) unlockBadge('eisen_master');
        if (lessons.length >= 10) unlockBadge('ders_ustası');
      },

      // Streak
      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const { streak } = get();
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (streak.lastDate === today) return;

        let nextStreak = streak;
        if (streak.lastDate === yesterday) {
          nextStreak = { current: streak.current + 1, lastDate: today };
        } else {
          nextStreak = { current: 1, lastDate: today };
        }
        set({ streak: nextStreak });

        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('profiles')
              .update({ streak_current: nextStreak.current, streak_last_date: nextStreak.lastDate })
              .eq('id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'updateStreak'); });
          }
        });
      },

      // Journal
      addJournal: (entry) => {
        const validEntry: JournalEntry = {
          ...entry,
          id: ensureUUID(entry.id)
        };
        set((s) => ({ journal: [validEntry, ...s.journal] }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('journal_entries').insert({
              id: validEntry.id,
              user_id: uid,
              date: validEntry.date,
              mood: validEntry.mood,
              energy: validEntry.energy ?? 7,
              stress: validEntry.stress ?? 3,
              sleep: validEntry.sleep ?? null,
              content: validEntry.content,
              tags: validEntry.tags ?? [],
              created_at: validEntry.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addJournal');
              else console.info('[Supabase Sync] Journal entry inserted:', validEntry.id);
            });
          }
        });
      },
      deleteJournal: (id) => {
        set((s) => ({ journal: s.journal.filter(j => j.id !== id) }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('journal_entries').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteJournal'); });
          }
        });
      },

      // Quran
      addQuranNote: (note) => {
        const validNote: QuranNote = {
          ...note,
          id: ensureUUID(note.id)
        };
        set((s) => ({ quranNotes: [validNote, ...s.quranNotes] }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('quran_notes').insert({
              id: validNote.id,
              user_id: uid,
              date: validNote.date,
              sure: validNote.sure,
              ayet: validNote.ayet,
              tefsir: validNote.tefsir,
              ders: validNote.ders,
              created_at: validNote.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addQuranNote');
              else console.info('[Supabase Sync] Quran note inserted:', validNote.id);
            });
          }
        });
      },
      deleteQuranNote: (id) => {
        set((s) => ({ quranNotes: s.quranNotes.filter(n => n.id !== id) }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('quran_notes').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteQuranNote'); });
          }
        });
      },

      // Hadis
      addHadisNote: (note) => {
        const validNote: HadisNote = {
          ...note,
          id: ensureUUID(note.id)
        };
        set((s) => ({ hadisNotes: [validNote, ...s.hadisNotes] }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('hadis_notes').insert({
              id: validNote.id,
              user_id: uid,
              date: validNote.date,
              metin: validNote.metin,
              kaynak: validNote.kaynak,
              konu: validNote.konu,
              uygulama: validNote.uygulama,
              created_at: validNote.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addHadisNote');
              else console.info('[Supabase Sync] Hadis note inserted:', validNote.id);
            });
          }
        });
      },
      deleteHadisNote: (id) => {
        set((s) => ({ hadisNotes: s.hadisNotes.filter(n => n.id !== id) }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('hadis_notes').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteHadisNote'); });
          }
        });
      },

      // Eisenhower
      addTask: (qKey, task) => {
        const validTask: EisenhowerTask = {
          ...task,
          id: ensureUUID(task.id)
        };
        set((s) => ({
          eisenhower: { ...s.eisenhower, [qKey]: [...s.eisenhower[qKey], validTask] }
        }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('eisenhower_tasks').insert({
              id: validTask.id,
              user_id: uid,
              quadrant: qKey,
              text: validTask.text,
              done: validTask.done,
              created_at: validTask.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addTask');
              else console.info('[Supabase Sync] Eisenhower task inserted:', validTask.id);
            });
          }
        });
      },
      toggleTask: (qKey, id) => {
        let newDoneState = false;
        set((s) => ({
          eisenhower: {
            ...s.eisenhower,
            [qKey]: s.eisenhower[qKey].map(t => {
              if (t.id === id) {
                newDoneState = !t.done;
                return { ...t, done: newDoneState };
              }
              return t;
            })
          }
        }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('eisenhower_tasks').update({ done: newDoneState }).eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'toggleTask'); });
          }
        });
      },
      deleteTask: (qKey, id) => {
        set((s) => ({
          eisenhower: { ...s.eisenhower, [qKey]: s.eisenhower[qKey].filter(t => t.id !== id) }
        }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('eisenhower_tasks').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteTask'); });
          }
        });
      },

      // Lessons
      addLesson: (entry) => {
        const validEntry: LessonEntry = {
          ...entry,
          id: ensureUUID(entry.id)
        };
        set((s) => ({ lessons: [validEntry, ...s.lessons] }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('lesson_entries').insert({
              id: validEntry.id,
              user_id: uid,
              date: validEntry.date,
              title: validEntry.title,
              wrong: validEntry.wrong,
              learned: validEntry.learned,
              severity: validEntry.severity,
              created_at: validEntry.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addLesson');
              else console.info('[Supabase Sync] Lesson inserted:', validEntry.id);
            });
          }
        });
      },
      deleteLesson: (id) => {
        set((s) => ({ lessons: s.lessons.filter(l => l.id !== id) }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('lesson_entries').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteLesson'); });
          }
        });
      },

      // Sukur
      addSukur: (entry) => {
        const validEntry: SukurEntry = {
          ...entry,
          id: ensureUUID(entry.id)
        };
        set((s) => ({ sukurList: [validEntry, ...s.sukurList] }));
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('sukur_entries').insert({
              id: validEntry.id,
              user_id: uid,
              date: validEntry.date,
              text: validEntry.text,
              nimet1: validEntry.nimets?.[0] ?? '',
              nimet2: validEntry.nimets?.[1] ?? '',
              nimet3: validEntry.nimets?.[2] ?? '',
              created_at: validEntry.createdAt
            }).then(({ error }) => {
              if (error) notifySyncError(error, 'addSukur');
              else console.info('[Supabase Sync] Sukur inserted:', validEntry.id);
            });
          }
        });
      },
      deleteSukur: (id) => {
        set((s) => ({ sukurList: s.sukurList.filter(e => e.id !== id) }));
        getAuthenticatedUserId().then((uid) => {
          if (uid && isValidUUID(id)) {
            supabase.from('sukur_entries').delete().eq('id', id).eq('user_id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'deleteSukur'); });
          }
        });
      },

      // Tespih
      incrementTespih: () => {
        let t = 0;
        set((s) => {
          t = s.totalZikir + 1;
          return { currentTespih: s.currentTespih + 1, totalZikir: t };
        });
        getAuthenticatedUserId().then((uid) => {
          if (uid) {
            supabase.from('profiles').update({ total_zikir: t }).eq('id', uid)
              .then(({ error }) => { if (error) notifySyncError(error, 'incrementTespih'); });
          }
        });
      },
      resetTespih: () => set({ currentTespih: 0 }),

      // Store Reset (Logout / User switch)
      resetStore: () => set({
        vehicle: VEHICLE_DEFS.car,
        vehicleChosen: false,
        xp: 0,
        badges: [],
        streak: { current: 1, lastDate: new Date().toISOString().split('T')[0] },
        journal: [],
        quranNotes: [],
        hadisNotes: [],
        eisenhower: { q1: [], q2: [], q3: [], q4: [] },
        lessons: [],
        sukurList: [],
        totalZikir: 0,
        currentTespih: 0,
        xpOrbTrigger: 0,
        lastXPAmount: 0,
      }),

      // Backup / Initial Load
      importAll: (data) => set({
        xp: data.xp ?? 0,
        vehicle: data.vehicle ?? VEHICLE_DEFS.car,
        badges: data.badges ?? [],
        streak: data.streak ?? { current: 1, lastDate: new Date().toISOString().split('T')[0] },
        journal: data.journal ?? [],
        quranNotes: data.quranNotes ?? [],
        hadisNotes: data.hadisNotes ?? [],
        eisenhower: data.eisenhower ?? { q1: [], q2: [], q3: [], q4: [] },
        lessons: data.lessons ?? [],
        sukurList: data.sukurList ?? [],
        totalZikir: data.totalZikir ?? 0,
      }),

      exportAll: () => {
        const s = get();
        return {
          xp: s.xp,
          vehicle: s.vehicle,
          badges: s.badges,
          streak: s.streak,
          journal: s.journal,
          quranNotes: s.quranNotes,
          hadisNotes: s.hadisNotes,
          eisenhower: s.eisenhower,
          lessons: s.lessons,
          sukurList: s.sukurList,
          totalZikir: s.totalZikir,
        };
      },
    }),
    {
      name: 'sah-world-store', // localStorage key
      partialize: (s) => ({
        vehicle: s.vehicle,
        vehicleChosen: s.vehicleChosen,
        xp: s.xp,
        badges: s.badges,
        streak: s.streak,
        journal: s.journal,
        quranNotes: s.quranNotes,
        hadisNotes: s.hadisNotes,
        eisenhower: s.eisenhower,
        lessons: s.lessons,
        sukurList: s.sukurList,
        totalZikir: s.totalZikir,
        currentTespih: s.currentTespih,
      }),
    }
  )
);
