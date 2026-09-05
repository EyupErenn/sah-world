import type { FocusSession } from '@/types'

const dayKey = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export type FocusHistoryStats = {
  lifetimeSeconds: number
  bestDaySeconds: number
  currentStreak: number
  averageQuality: number | null
  qualityTrend: number | null
  interruptionFreeRate: number
}

export function getFocusHistoryStats(sessions: FocusSession[], now = new Date()): FocusHistoryStats {
  const meaningful = sessions.filter((session) => session.completed || session.actualDurationSeconds >= 600)
  const byDay = new Map<string, number>()
  meaningful.forEach((session) => byDay.set(dayKey(session.startedAt), (byDay.get(dayKey(session.startedAt)) ?? 0) + session.actualDurationSeconds))
  let currentStreak = 0
  const cursor = new Date(now)
  cursor.setHours(12, 0, 0, 0)
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (byDay.has(dayKey(cursor))) {
    currentStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  const rated = meaningful.filter((session) => session.focusQualityRating)
  const recent = rated.slice(0, 5)
  const previous = rated.slice(5, 10)
  const average = (items: FocusSession[]) => items.length
    ? items.reduce((sum, session) => sum + (session.focusQualityRating ?? 0), 0) / items.length
    : null
  const recentAverage = average(recent)
  const previousAverage = average(previous)
  return {
    lifetimeSeconds: meaningful.reduce((sum, session) => sum + session.actualDurationSeconds, 0),
    bestDaySeconds: Math.max(0, ...byDay.values()),
    currentStreak,
    averageQuality: average(rated),
    qualityTrend: recentAverage !== null && previousAverage !== null ? recentAverage - previousAverage : null,
    interruptionFreeRate: meaningful.length ? meaningful.filter((session) => (session.interruptionCount ?? 0) === 0).length / meaningful.length : 0,
  }
}

export type AdaptiveFocusSuggestion = { minutes: number; message: string }

/** Uses only the latest 15 reflected sessions. No rating data means no guess. */
export function getAdaptiveFocusSuggestion(sessions: FocusSession[]): AdaptiveFocusSuggestion | null {
  const recent = sessions
    .filter((session) => session.focusQualityRating && (session.completed || session.actualDurationSeconds >= 600))
    .slice(0, 15)
  if (recent.length < 5) return null

  const short = recent.filter((session) => session.actualDurationSeconds <= 30 * 60)
  const long = recent.filter((session) => session.actualDurationSeconds >= 40 * 60)
  const quality = (items: FocusSession[]) => items.reduce((sum, item) => sum + (item.focusQualityRating ?? 0), 0) / Math.max(1, items.length)
  const interruptions = (items: FocusSession[]) => items.reduce((sum, item) => sum + (item.interruptionCount ?? 0), 0) / Math.max(1, items.length)

  if (short.length >= 2 && long.length >= 2 && (quality(short) >= quality(long) + .45 || interruptions(long) >= interruptions(short) + .8)) {
    return { minutes: 25, message: 'Kısa oturumlarda kalite ve kesintisizlik daha güçlü görünüyor. 25 dakika deneyebilirsin.' }
  }

  const strong = recent.filter((session) => (session.focusQualityRating ?? 0) >= 4 && (session.interruptionCount ?? 0) === 0)
  if (strong.length < 3) return null
  const averageMinutes = strong.reduce((sum, session) => sum + session.actualDurationSeconds / 60, 0) / strong.length
  const minutes = Math.min(50, Math.max(15, Math.round(averageMinutes / 5) * 5))
  return { minutes, message: `En nitelikli kesintisiz oturumların yaklaşık ${minutes} dakika. Bir sonraki turu buna göre ayarlayabilirsin.` }
}

export function focusDayKey(value: string | Date) {
  return dayKey(value)
}
