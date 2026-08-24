'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppIcon } from '@/components/ui/AppIcon'
import { FOCUS_TIMER_STORAGE_KEY, formatFocusDuration, formatTimer, type PersistedFocusTimer } from '@/lib/focus'
import { FocusAudioEngine } from '@/lib/focusAudio'
import { finalizeFocusSession } from '@/lib/focusRuntime'
import { useJourneyStore } from '@/store/useJourneyStore'
import { getFocusDisplaySeconds, getFocusElapsedSeconds, useFocusTimerStore, type FocusWidgetPosition } from '@/store/useFocusTimerStore'

export default function FocusTimerFloatingWidget() {
  const timer = useFocusTimerStore()
  const journey = useJourneyStore()
  const [now, setNow] = useState(0)
  const completionHandled = useRef(false)
  const audioRef = useRef<FocusAudioEngine | null>(null)

  useEffect(() => {
    audioRef.current = new FocusAudioEngine()
    const legacyRaw = window.localStorage.getItem(FOCUS_TIMER_STORAGE_KEY)
    if (!useFocusTimerStore.getState().isActive && legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as PersistedFocusTimer
        if (legacy.version === 1 && ['running', 'paused'].includes(legacy.phase)) {
          timer.restoreLegacy({
            taskLabel: legacy.taskLabel,
            timerType: legacy.timerType,
            plannedDurationSeconds: legacy.plannedDurationSeconds,
            elapsedBeforeRun: legacy.elapsedBeforeRun,
            runStartedAt: legacy.runStartedAt,
            sessionStartedAt: Date.parse(legacy.startedAt),
            isPaused: legacy.phase === 'paused',
          })
        }
      } catch {
        // Invalid legacy state is discarded; no user data outside the timer is touched.
      }
      window.localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY)
    }
    return () => audioRef.current?.stop()
    // Store actions are stable; this migration intentionally runs once at root mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!timer.isActive || timer.isPaused) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [timer.isActive, timer.isPaused])

  useEffect(() => {
    if (!timer.isActive) completionHandled.current = false
  }, [timer.isActive])

  const clockNow = now || timer.startedAt || timer.sessionStartedAt || 0
  const elapsedSeconds = getFocusElapsedSeconds(timer, clockNow)
  useEffect(() => {
    if (
      completionHandled.current ||
      !timer.isActive ||
      timer.isPaused ||
      timer.timerType !== 'countdown' ||
      elapsedSeconds < timer.plannedDurationSeconds
    ) return
    completionHandled.current = true
    const session = finalizeFocusSession(true)
    if (session) {
      audioRef.current?.beep(860, .3)
      window.dispatchEvent(new CustomEvent('sah:focus-completed', { detail: session }))
    }
  }, [elapsedSeconds, timer.isActive, timer.isPaused, timer.plannedDurationSeconds, timer.timerType])

  const logToJournal = () => {
    const session = timer.completedSession
    if (!session) return
    const note = `🎯 ${Math.max(1, Math.round(session.actualDurationSeconds / 60))} dakika odaklanıldı: ${session.taskLabel}`
    journey.logFocusToJournal(session.id, note)
    timer.dismissCompletion()
  }

  return <>
    <FocusTimerWidgetCard now={clockNow} />
    {timer.completedSession && <div className="focus-global-modal-backdrop" role="presentation">
      <section className="focus-global-modal" role="dialog" aria-modal="true" aria-labelledby="focus-global-complete-title">
        <span className="focus-global-success"><AppIcon name="sparkles" /></span>
        <div><span className="eyebrow">ODAK TAMAMLANDI</span><h2 id="focus-global-complete-title">Emeğin gününde bir iz bıraktı.</h2></div>
        <div className="focus-complete-summary"><span><AppIcon name="target-arrow" /></span><div><strong>{timer.completedSession.taskLabel}</strong><p>{formatFocusDuration(timer.completedSession.actualDurationSeconds)} odak · +{timer.completedSession.xpAwarded} XH</p></div></div>
        <p className="journal-offer-copy">Bu oturumu bugünün Günlük kaydına eklemek ister misin?</p>
        <footer><button onClick={timer.dismissCompletion}>Şimdi değil</button><button onClick={logToJournal}>Günlüğe ekle</button></footer>
      </section>
    </div>}
  </>
}

function FocusTimerWidgetCard({ now }: { now: number }) {
  const router = useRouter()
  const timer = useFocusTimerStore()
  const [dragPosition, setDragPosition] = useState<FocusWidgetPosition | null>(null)
  const drag = useRef<{ pointerId: number; offsetX: number; offsetY: number; moved: boolean } | null>(null)
  const displaySeconds = getFocusDisplaySeconds(timer, now)
  const elapsedSeconds = getFocusElapsedSeconds(timer, now)
  const progress = timer.timerType === 'countdown'
    ? Math.min(1, elapsedSeconds / Math.max(1, timer.plannedDurationSeconds))
    : (elapsedSeconds % 3600) / 3600
  const position = dragPosition ?? timer.position
  const circumference = 2 * Math.PI * 22

  useEffect(() => {
    if (!timer.isActive || timer.positionInitialized) return
    timer.initialisePosition({ x: Math.max(16, window.innerWidth - 260), y: 96 })
  }, [timer])

  const openFullscreen = () => {
    if (window.location.pathname !== '/') {
      timer.setFullscreen(true)
      router.push('/?focus=1')
      return
    }
    window.dispatchEvent(new CustomEvent('sah:open-focus'))
    timer.setFullscreen(true)
  }

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y, moved: false }
  }
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    drag.current.moved = true
    const width = 236
    const height = 148
    setDragPosition({
      x: Math.min(Math.max(8, event.clientX - drag.current.offsetX), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(Math.max(8, event.clientY - drag.current.offsetY), Math.max(8, window.innerHeight - height - 8)),
    })
  }
  const pointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    if (dragPosition) timer.setPosition(dragPosition)
    setDragPosition(null)
    drag.current = null
  }

  const endSession = () => {
    if (!window.confirm('Odak oturumunu şimdi bitirip süreyi kaydetmek istiyor musun?')) return
    const session = finalizeFocusSession(false)
    if (session) window.dispatchEvent(new CustomEvent('sah:focus-completed', { detail: session }))
  }

  const statusLabel = timer.isPaused ? 'Duraklatıldı' : timer.timerType === 'countdown' ? 'Odak sürüyor' : 'Serbest odak'
  const style = useMemo(() => ({ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }), [position.x, position.y])

  if (!timer.isActive || timer.isFullscreen) return null
  return <aside
    className={`focus-floating-widget ${timer.isPaused ? 'paused' : ''}`}
    style={style}
    aria-label="Devam eden odak oturumu"
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerUp}
    onPointerCancel={pointerUp}
  >
    <header>
      <button onClick={openFullscreen} aria-label="Odak ekranını büyüt"><AppIcon name="arrows-maximize" /></button>
      <span><i /> {statusLabel}</span>
      <button onClick={endSession} aria-label="Odak oturumunu bitir"><AppIcon name="x" /></button>
    </header>
    <div className="focus-floating-main">
      <div className="focus-floating-ring" aria-hidden>
        <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" /><circle className="progress" cx="26" cy="26" r="22" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} /></svg>
        <AppIcon name="target-arrow" />
      </div>
      <div><strong>{formatTimer(displaySeconds)}</strong><span>{timer.taskLabel}</span></div>
    </div>
    <footer>
      <button onClick={() => timer.isPaused ? timer.resume() : timer.pause()}>
        <AppIcon name={timer.isPaused ? 'player-play-filled' : 'player-pause-filled'} />
        {timer.isPaused ? 'Devam et' : 'Duraklat'}
      </button>
      <button onClick={openFullscreen}><AppIcon name="maximize" /> Aç</button>
    </footer>
  </aside>
}
