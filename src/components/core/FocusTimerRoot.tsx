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
  const [completionStep, setCompletionStep] = useState<'reflection' | 'journal'>('reflection')
  const [qualityRating, setQualityRating] = useState(0)
  const [reflectionNote, setReflectionNote] = useState('')
  const [welcomeBack, setWelcomeBack] = useState(false)
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

  useEffect(() => {
    const onVisibilityChange = () => {
      const current = useFocusTimerStore.getState()
      if (!current.isActive) return
      if (document.visibilityState === 'hidden') {
        if (!current.isPaused) current.markAway(Date.now())
      }
      else {
        const awaySeconds = current.returnFromAway(Date.now())
        if (awaySeconds >= 2) {
          setWelcomeBack(true)
          window.setTimeout(() => setWelcomeBack(false), 5200)
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    const completed = timer.completedSession
    if (!completed) return
    const reset = window.setTimeout(() => {
      setCompletionStep('reflection')
      setQualityRating(completed.focusQualityRating ?? 0)
      setReflectionNote(completed.postSessionNote ?? '')
    }, 0)
    return () => window.clearTimeout(reset)
  }, [timer.completedSession])

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
    const details = [
      `🎯 ${Math.max(1, Math.round(session.actualDurationSeconds / 60))} dakika odaklanıldı: ${session.taskLabel}`,
      session.intentionText ? `Niyet: ${session.intentionText}` : '',
      qualityRating ? `Odak kalitesi: ${qualityRating}/5` : '',
      session.interruptionCount ? `Kesinti: ${session.interruptionCount} kez · ${Math.round(session.totalAwaySeconds / 60)} dk uzakta` : 'Kesintisiz tamamlandı',
      reflectionNote.trim() ? `Oturum notu: ${reflectionNote.trim()}` : '',
    ].filter(Boolean)
    const note = details.join('\n')
    journey.logFocusToJournal(session.id, note)
    timer.dismissCompletion()
  }

  const saveReflection = () => {
    const session = timer.completedSession
    if (!session) return
    journey.updateFocusSessionReflection(session.id, qualityRating || undefined, reflectionNote)
    setCompletionStep('journal')
  }

  return <>
    <FocusTimerWidgetCard now={clockNow} />
    <AnimateWelcomeBack visible={welcomeBack} />
    {timer.completedSession && <div className="focus-global-modal-backdrop" role="presentation">
      <section className="focus-global-modal" role="dialog" aria-modal="true" aria-labelledby="focus-global-complete-title">
        <span className="focus-global-success"><AppIcon name="sparkles" /></span>
        <div><span className="eyebrow">{completionStep === 'reflection' ? 'KISA YANSIMA' : 'ODAK TAMAMLANDI'}</span><h2 id="focus-global-complete-title">{completionStep === 'reflection' ? 'Bu oturum sana nasıl geldi?' : 'Emeğin gününde bir iz bıraktı.'}</h2></div>
        <div className="focus-complete-summary"><span><AppIcon name="target-arrow" /></span><div><strong>{timer.completedSession.taskLabel}</strong><p>{formatFocusDuration(timer.completedSession.actualDurationSeconds)} odak · +{timer.completedSession.xpAwarded} XH</p></div></div>
        {completionStep === 'reflection' ? <>
          <div className="focus-reflection-form"><span>Odak kaliten</span><div role="radiogroup" aria-label="Odak kalitesi">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={qualityRating === rating ? 'selected' : ''} onClick={() => setQualityRating(rating)} aria-label={`${rating} üzerinden 5`}>{rating}<small>{['Dağınık', 'Zor', 'Dengeli', 'İyi', 'Derin'][rating - 1]}</small></button>)}</div><textarea value={reflectionNote} onChange={(event) => setReflectionNote(event.target.value)} maxLength={600} rows={3} placeholder="Ne iyi gitti, bir sonraki oturumda neyi değiştirmek istersin? (isteğe bağlı)" /></div>
          <footer><button onClick={() => setCompletionStep('journal')}>Atla</button><button onClick={saveReflection}>Yansımayı kaydet</button></footer>
        </> : <>
          <p className="journal-offer-copy">Bu oturumu bugünün Günlük kaydına eklemek ister misin?</p>
          <footer><button onClick={timer.dismissCompletion}>Şimdi değil</button><button onClick={logToJournal}>Bugünün günlüğüne ekle</button></footer>
        </>}
      </section>
    </div>}
  </>
}

function AnimateWelcomeBack({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <div className="focus-welcome-back" role="status"><span><AppIcon name="heart-handshake" /></span><div><strong>Tekrar hoş geldin, devam edelim mi?</strong><small>Oturumun ve kalan süren güvende.</small></div></div>
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
    if (!timer.isActive) return
    const clampPosition = () => {
      const current = useFocusTimerStore.getState()
      const width = window.innerWidth <= 620 ? 220 : 236
      const next = {
        x: Math.min(Math.max(8, current.position.x), Math.max(8, window.innerWidth - width - 8)),
        y: Math.min(Math.max(8, current.position.y), Math.max(8, window.innerHeight - 148 - 8)),
      }
      if (!current.positionInitialized) current.initialisePosition({ x: Math.max(8, window.innerWidth - width - 16), y: 96 })
      else if (next.x !== current.position.x || next.y !== current.position.y) current.setPosition(next)
    }
    clampPosition()
    window.addEventListener('resize', clampPosition)
    return () => window.removeEventListener('resize', clampPosition)
  }, [timer.isActive])

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
