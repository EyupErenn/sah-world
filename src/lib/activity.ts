import type { EisenhowerState, FocusSession, HadisNote, IntegratedActivity, JournalEntry, LessonEntry, QuranNote, SukurEntry } from '@/types';

export type ActivityCategory = IntegratedActivity['category'];

export type ActivityEvent = {
  id: string;
  category: ActivityCategory;
  label: string;
  detail: string;
  xp: number;
  createdAt: string;
};

export type ActivitySource = {
  journal: JournalEntry[];
  quranNotes: QuranNote[];
  hadisNotes: HadisNote[];
  eisenhower: EisenhowerState;
  lessons: LessonEntry[];
  sukurList: SukurEntry[];
  totalZikir: number;
  focusSessions: FocusSession[];
};

export const CATEGORY_META: Record<ActivityCategory, { label: string; icon: string; color: string }> = {
  journal: { label: 'Günlük', icon: 'notebook', color: '#4f46e5' },
  quran: { label: 'Kur’an', icon: 'book-2', color: '#d97706' },
  hadis: { label: 'Hadis', icon: 'quote', color: '#0f766e' },
  matrix: { label: 'Matris', icon: 'layout-grid', color: '#0284c7' },
  lessons: { label: 'Hatalar', icon: 'history', color: '#be123c' },
  sukur: { label: 'Şükür', icon: 'sparkles', color: '#059669' },
  mescidim: { label: 'Mescidim', icon: 'building-mosque', color: '#7c3aed' },
  focus: { label: 'Odak', icon: 'target-arrow', color: '#0d9488' },
  profession: { label: 'Meslek ve Ahlak', icon: 'certificate', color: '#7c3aed' },
  awareness: { label: 'Farkındalık', icon: 'world-heart', color: '#db2777' },
};

export function mapIntegratedActivities(items: IntegratedActivity[]): ActivityEvent[] {
  return items.map((item) => ({
    id: item.id,
    category: item.category,
    label: item.label,
    detail: item.detail,
    xp: item.xp,
    createdAt: item.occurredAt,
  }));
}

export type SearchResult = { id: string; category: ActivityCategory; view: string; title: string; preview: string; searchable: string; icon: string; color: string };

export function buildSearchIndex(source: ActivitySource): SearchResult[] {
  const make = (category: ActivityCategory, id: string, title: string, preview: string) => ({
    id, category, view: category, title, preview, searchable: `${title} ${preview}`.toLocaleLowerCase('tr-TR'),
    icon: CATEGORY_META[category].icon, color: CATEGORY_META[category].color,
  });
  return [
    ...source.journal.map((item) => make('journal', item.id, 'Günlük kaydı', item.content)),
    ...source.quranNotes.map((item) => make('quran', item.id, `${item.sure || 'Kur’an'} notu`, `${item.ayet} ${item.tefsir} ${item.ders}`)),
    ...source.hadisNotes.map((item) => make('hadis', item.id, item.konu || 'Hadis notu', `${item.metin} ${item.kaynak} ${item.uygulama}`)),
    ...Object.values(source.eisenhower).flat().map((item) => make('matrix', item.id, item.done ? 'Tamamlanan görev' : 'Görev', item.text)),
    ...source.lessons.map((item) => make('lessons', item.id, item.title || 'Hatalar ve Dersler', `${item.wrong} ${item.learned}`)),
    ...source.sukurList.map((item) => make('sukur', item.id, 'Şükür kaydı', `${item.text} ${item.nimets.join(' ')}`)),
    ...source.focusSessions.map((item) => make('focus', item.id, 'Odak oturumu', `${item.taskLabel} ${Math.round(item.actualDurationSeconds / 60)} dakika`)),
  ].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
}

export function buildActivityFeed(source: ActivitySource): ActivityEvent[] {
  const tasks = Object.values(source.eisenhower).flat();
  return [
    ...source.journal.map((item) => ({ id: item.id, category: 'journal' as const,
      label: item.entryMode === 'quick' ? '⚡ Hızlı kayıt' : item.ritualType === 'sabah' ? '🌅 Sabah Niyeti' : item.ritualType === 'aksam' ? '🌙 Akşam Muhasebesi' : 'Günlük kaydı',
      detail: item.content || item.intentionText || 'Günün kısa muhasebesi tamamlandı', xp: item.xpAwarded ?? 25, createdAt: item.createdAt })),
    ...source.quranNotes.map((item) => ({ id: item.id, category: 'quran' as const, label: 'Kuran notu', detail: item.sure ? `${item.sure} üzerine tefekkür` : 'Tefekkür notu eklendi', xp: 35, createdAt: item.createdAt })),
    ...source.hadisNotes.map((item) => ({ id: item.id, category: 'hadis' as const, label: 'Hadis notu', detail: item.kaynak || 'Yeni ders kaydedildi', xp: 30, createdAt: item.createdAt })),
    ...tasks.filter((item) => item.done).map((item) => ({ id: item.id, category: 'matrix' as const, label: 'Görev tamamlandı', detail: item.text, xp: 25, createdAt: item.completedAt ?? item.createdAt })),
    ...source.lessons.map((item) => ({ id: item.id, category: 'lessons' as const, label: 'Ders kaydı', detail: item.title || 'Deneyimden öğrenilen ders', xp: 25, createdAt: item.createdAt })),
    ...source.sukurList.map((item) => ({ id: item.id, category: 'sukur' as const, label: 'Şükür kaydı', detail: item.text || 'Yeni bir nimet fark edildi', xp: 20, createdAt: item.createdAt })),
    ...source.focusSessions.map((item) => ({ id: item.id, category: 'focus' as const, label: 'Odak oturumu', detail: `${item.taskLabel} · ${Math.round(item.actualDurationSeconds / 60)} dakika`, xp: item.xpAwarded, createdAt: item.endedAt })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function relativeTime(value: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 45) return 'az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export function dayKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getCategoryCounts(source: ActivitySource): Record<ActivityCategory, number> {
  const tasks = Object.values(source.eisenhower).flat();
  return {
    journal: source.journal.length,
    quran: source.quranNotes.length,
    hadis: source.hadisNotes.length,
    matrix: tasks.length,
    lessons: source.lessons.length,
    sukur: source.sukurList.length,
    mescidim: Math.floor(source.totalZikir / 33),
    focus: source.focusSessions.length,
    profession: 0,
    awareness: 0,
  };
}

export function getDailyActivity(events: ActivityEvent[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const event of events) {
    const key = dayKey(event.createdAt);
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}
