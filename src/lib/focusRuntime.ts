'use client'

import { calculateFocusXP, formatFocusDuration } from '@/lib/focus'
import { recordXpEvent } from '@/lib/xp'
import { ensureUUID, useJourneyStore } from '@/store/useJourneyStore'
import { getFocusElapsedSeconds, useFocusTimerStore } from '@/store/useFocusTimerStore'
import type { FocusSession } from '@/types'

let finishing = false

export function finalizeFocusSession(naturalCompletion: boolean): FocusSession | null {
  let timer = useFocusTimerStore.getState()
  if (finishing || !timer.isActive || timer.sessionStartedAt === null) return null
  const sessionStartedAt = timer.sessionStartedAt
  finishing = true

  timer.returnFromAway(Date.now())
  timer = useFocusTimerStore.getState()

  const elapsed = getFocusElapsedSeconds(timer)
  const actualDurationSeconds = Math.min(
    12 * 60 * 60,
    Math.max(1, Math.floor(naturalCompletion && timer.timerType === 'countdown' ? timer.plannedDurationSeconds : elapsed)),
  )
  const completed = timer.timerType === 'countdown' ? naturalCompletion : actualDurationSeconds >= 5 * 60
  const xpAwarded = calculateFocusXP(actualDurationSeconds, completed, timer.timerType, timer.interruptionCount, timer.totalAwaySeconds)
  const session: FocusSession = {
    id: ensureUUID(),
    taskLabel: timer.taskLabel.trim() || 'Odak oturumu',
    intentionText: timer.intentionText.trim() || undefined,
    timerType: timer.timerType,
    plannedDurationSeconds: timer.timerType === 'countdown' ? timer.plannedDurationSeconds : 0,
    actualDurationSeconds,
    startedAt: new Date(sessionStartedAt).toISOString(),
    endedAt: new Date().toISOString(),
    completed,
    xpAwarded,
    interruptionCount: timer.interruptionCount,
    totalAwaySeconds: timer.totalAwaySeconds,
  }

  const journey = useJourneyStore.getState()
  journey.addFocusSession(session)
  if (xpAwarded > 0) {
    journey.addXP(xpAwarded)
    journey.updateStreak()
    void recordXpEvent({ sourceType: 'focus', sourceId: session.id, label: `${session.taskLabel} odak oturumu`, amount: xpAwarded })
  }
  timer.complete(session)

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('SAH · Odak oturumu tamamlandı', {
      body: `${session.taskLabel} · ${formatFocusDuration(actualDurationSeconds)}`,
      icon: '/favicon.ico',
    })
  }

  window.setTimeout(() => { finishing = false }, 300)
  return session
}
