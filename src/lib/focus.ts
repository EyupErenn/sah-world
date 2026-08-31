import type { FocusSession, FocusTimerType } from '@/types'

export const FOCUS_TIMER_STORAGE_KEY = 'sah-focus-active-session-v1'

export type PersistedFocusTimer = {
  version: 1
  taskLabel: string
  timerType: FocusTimerType
  plannedDurationSeconds: number
  elapsedBeforeRun: number
  runStartedAt: number | null
  startedAt: string
  phase: 'running' | 'paused'
}

export function calculateAwayReturn(awayStartedAt: number | null, at: number, interruptionCount: number, totalAwaySeconds: number) {
  if (awayStartedAt === null) return { awaySeconds: 0, interruptionCount, totalAwaySeconds }
  const awaySeconds = Math.max(0, Math.round((at - awayStartedAt) / 1000))
  return {
    awaySeconds,
    interruptionCount: Math.min(10000, interruptionCount + (awaySeconds >= 2 ? 1 : 0)),
    totalAwaySeconds: Math.min(43200, totalAwaySeconds + awaySeconds),
  }
}

/**
 * Completed countdown: 0.8 XP/minute, 10–60 XP.
 * Intentional stopwatch finish: same formula after 5 minutes.
 * Early countdown stop: 2 XP per five focused minutes, capped at 12 XP.
 */
export function calculateFocusXP(actualSeconds: number, completed: boolean, timerType: FocusTimerType, interruptionCount = 0, totalAwaySeconds = 0): number {
  const safeSeconds = Math.max(0, Math.min(actualSeconds, 12 * 60 * 60))
  if (completed || (timerType === 'stopwatch' && safeSeconds >= 5 * 60)) {
    const fullReward = Math.min(60, Math.max(10, Math.round(safeSeconds / 75)))
    const awayRatio = safeSeconds ? Math.min(.5, totalAwaySeconds / safeSeconds) : 0
    const focusBonusFactor = Math.max(.2, 1 - (interruptionCount * .08) - (awayRatio * .7))
    const protectedBase = Math.max(1, Math.round(fullReward * .6))
    return Math.max(1, Math.round(protectedBase + ((fullReward - protectedBase) * focusBonusFactor)))
  }
  if (safeSeconds < 5 * 60) return 0
  return Math.min(12, Math.floor(safeSeconds / (5 * 60)) * 2)
}

export function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  if (hours) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatFocusDuration(seconds: number): string {
  const minutes = Math.round(Math.max(0, seconds) / 60)
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} sa ${remainder} dk` : `${hours} sa`
}

export function totalFocusSeconds(sessions: FocusSession[], from?: Date): number {
  return sessions
    .filter((session) => !from || new Date(session.startedAt) >= from)
    .reduce((total, session) => total + session.actualDurationSeconds, 0)
}

export function isSameLocalDay(value: string | Date, reference = new Date()): boolean {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth() && date.getDate() === reference.getDate()
}
