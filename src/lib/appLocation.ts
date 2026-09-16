export const APP_VIEWS = ['dashboard', 'growth', 'focus', 'quran-companion', 'mescidim', 'journal', 'awareness', 'reports', 'profession-school', 'community'] as const;
export type AppView = typeof APP_VIEWS[number];
export const JOURNAL_TABS = ['journal', 'matrix', 'sukur', 'lessons'] as const;
export const QURAN_TABS = ['home', 'wheel', 'teachers', 'appointments', 'peers', 'study', 'manage'] as const;
export const MESCIDIM_TABS = ['vakitler', 'asma', 'dua', 'etkinlikler'] as const;
export function selectedValue<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}
export function readAppView(params: Pick<URLSearchParams, 'get'>): AppView {
  return selectedValue(params.get('view'), APP_VIEWS, params.get('focus') === '1' ? 'focus' : 'dashboard');
}
export function appLocation(search: string, view: AppView, tab?: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(search);
  for (const key of ['view', 'tab', 'wisdom', 'archive', 'focus']) params.delete(key);
  params.set('view', view);
  if (tab) params.set('tab', tab);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `?${params.toString()}`;
}
/** Native history integrates with Next useSearchParams, without refetching private data. */
export function openAppView(view: AppView, tab?: string, extra?: Record<string, string>): void {
  const next = `${window.location.pathname}${appLocation(window.location.search, view, tab, extra)}`;
  if (next !== `${window.location.pathname}${window.location.search}`) window.history.pushState(null, '', next);
}
