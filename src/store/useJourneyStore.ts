import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
import { VEHICLE_DEFS, BADGES, getLevelForXP } from '@/lib/constants';

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

  // XP Orb trigger (counter that UI can watch to spawn orbs)
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
      setVehicle: (v) => set({ vehicle: v, vehicleChosen: true }),

      // XP
      addXP: (amount) => {
        set((s) => ({
          xp: s.xp + amount,
          xpOrbTrigger: s.xpOrbTrigger + 1,
          lastXPAmount: amount,
        }));
        get().checkBadges();
      },

      unlockBadge: (id) => {
        const earned = get().badges;
        if (!earned.includes(id)) {
          set({ badges: [...earned, id] });
        }
      },

      checkBadges: () => {
        const { xp, journal, quranNotes, hadisNotes, lessons, sukurList, totalZikir, eisenhower, unlockBadge } = get();
        const completedTasks = [...eisenhower.q1, ...eisenhower.q2, ...eisenhower.q3, ...eisenhower.q4].filter(t => t.done).length;

        if (xp > 0 || journal.length > 0 || sukurList.length > 0) unlockBadge('first_step');
        if (sukurList.length >= 20) unlockBadge('sukur_master');
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
        if (streak.lastDate === yesterday) {
          set({ streak: { current: streak.current + 1, lastDate: today } });
        } else {
          set({ streak: { current: 1, lastDate: today } });
        }
      },

      // Journal
      addJournal: (entry) => set((s) => ({ journal: [entry, ...s.journal] })),
      deleteJournal: (id) => set((s) => ({ journal: s.journal.filter(j => j.id !== id) })),

      // Quran
      addQuranNote: (note) => set((s) => ({ quranNotes: [note, ...s.quranNotes] })),
      deleteQuranNote: (id) => set((s) => ({ quranNotes: s.quranNotes.filter(n => n.id !== id) })),

      // Hadis
      addHadisNote: (note) => set((s) => ({ hadisNotes: [note, ...s.hadisNotes] })),
      deleteHadisNote: (id) => set((s) => ({ hadisNotes: s.hadisNotes.filter(n => n.id !== id) })),

      // Eisenhower
      addTask: (qKey, task) => set((s) => ({
        eisenhower: { ...s.eisenhower, [qKey]: [...s.eisenhower[qKey], task] }
      })),
      toggleTask: (qKey, id) => set((s) => ({
        eisenhower: {
          ...s.eisenhower,
          [qKey]: s.eisenhower[qKey].map(t => t.id === id ? { ...t, done: !t.done } : t)
        }
      })),
      deleteTask: (qKey, id) => set((s) => ({
        eisenhower: { ...s.eisenhower, [qKey]: s.eisenhower[qKey].filter(t => t.id !== id) }
      })),

      // Lessons
      addLesson: (entry) => set((s) => ({ lessons: [entry, ...s.lessons] })),
      deleteLesson: (id) => set((s) => ({ lessons: s.lessons.filter(l => l.id !== id) })),

      // Sukur
      addSukur: (entry) => set((s) => ({ sukurList: [entry, ...s.sukurList] })),
      deleteSukur: (id) => set((s) => ({ sukurList: s.sukurList.filter(e => e.id !== id) })),

      // Tespih
      incrementTespih: () => set((s) => {
        const next = s.currentTespih + 1;
        const totalZikir = s.totalZikir + 1;
        return { currentTespih: next, totalZikir };
      }),
      resetTespih: () => set({ currentTespih: 0 }),

      // Backup
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
      // Only persist non-ephemeral fields
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
