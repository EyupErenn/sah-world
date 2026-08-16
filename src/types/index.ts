// ============================================================
// SAH WORLD — Shared TypeScript Types
// ============================================================

export type VehicleType = 'car' | 'bike' | 'horse' | 'rocket';

export interface VehicleDef {
  type: VehicleType;
  name: string;
  icon: string;
  flavorText: string;
  color: string;
}

export interface StationDef {
  id: number;
  name: string;
  label: string;
  progress: number;   // 0.0 - 1.0 along the curve
  panelId: string;
  color: string;      // hex string, e.g. '#4f46e5'
  threeColor: number; // hex number, e.g. 0x4f46e5
  icon: string;       // Tabler icon class name
  xpReward: number;
}

export interface LevelDef {
  xp: number;
  name: string;
  icon: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

// === Data Entries ===

export interface JournalEntry {
  id: string;
  date: string;
  mood: number;       // 1-5
  energy: number;     // 1-10
  stress: number;     // 1-10
  sleep?: number;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface QuranNote {
  id: string;
  date: string;
  sure: string;
  ayet: string;
  tefsir: string;
  ders: string;
  createdAt: string;
}

export interface HadisNote {
  id: string;
  date: string;
  metin: string;
  kaynak: string;
  konu: string;
  uygulama: string;
  createdAt: string;
}

export interface EisenhowerTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface EisenhowerState {
  q1: EisenhowerTask[];
  q2: EisenhowerTask[];
  q3: EisenhowerTask[];
  q4: EisenhowerTask[];
}

export interface LessonEntry {
  id: string;
  date: string;
  title: string;
  wrong: string;
  learned: string;
  severity: number;   // 1-5
  createdAt: string;
}

export interface SukurEntry {
  id: string;
  date: string;
  text: string;
  nimets: [string, string, string];
  createdAt: string;
}

export interface StreakData {
  current: number;
  lastDate: string;  // YYYY-MM-DD
}
