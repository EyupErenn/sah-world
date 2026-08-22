'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FocusTimeline from './FocusTimeline'
import { AppIcon } from '@/components/ui/AppIcon'
import { useJourneyStore, ensureUUID } from '@/store/useJourneyStore'
import { calculateFocusXP, FOCUS_TIMER_STORAGE_KEY, formatFocusDuration, formatTimer, type PersistedFocusTimer } from '@/lib/focus'
import { FocusAudioEngine, FOCUS_SOUNDS, type FocusSoundId } from '@/lib/focusAudio'
import { recordXpEvent } from '@/lib/xp'
import type { FocusSession, FocusTimerType } from '@/types'

type Phase = 'idle' | 'running' | 'paused' | 'finished'
type Modal = 'timer-type' | 'sound' | 'stop' | 'journal' | 'interrupted' | null

export default function FocusTimerView({ onExit }: { onExit: () => void }) {
  const store = useJourneyStore()
  const [taskLabel, setTaskLabel] = useState('')
  const [taskDraft, setTaskDraft] = useState('')
  const [timerType, setTimerType] = useState<FocusTimerType>('countdown')
  const [plannedMinutes, setPlannedMinutes] = useState(50)
  const [phase, setPhase] = useState<Phase>('idle')
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [elapsedBeforeRun, setElapsedBeforeRun] = useState(0)
  const [now, setNow] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const [draftTimerType, setDraftTimerType] = useState<FocusTimerType>('countdown')
  const [draftMinutes, setDraftMinutes] = useState(50)
  const [sound, setSound] = useState<FocusSoundId>('none')
  const [draftSound, setDraftSound] = useState<FocusSoundId>('none')
  const [volume, setVolume] = useState(.35)
  const [draftVolume, setDraftVolume] = useState(.35)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [lastSession, setLastSession] = useState<FocusSession | null>(null)
  const [interrupted, setInterrupted] = useState<PersistedFocusTimer | null>(null)
  const finishingRef = useRef(false)
  const lastBeepSecondRef = useRef<number | null>(null)
  const audioRef = useRef<FocusAudioEngine | null>(null)
  const plannedSeconds = plannedMinutes * 60
  const elapsedSeconds = elapsedBeforeRun + (phase === 'running' && runStartedAt ? Math.max(0, (now - runStartedAt) / 1000) : 0)
  const displaySeconds = timerType === 'countdown' ? Math.max(0, plannedSeconds - elapsedSeconds) : elapsedSeconds
  const progress = timerType === 'countdown' ? Math.min(1, elapsedSeconds / Math.max(1, plannedSeconds)) : (elapsedSeconds % 3600) / 3600
  const isActive = phase === 'running' || phase === 'paused'
  const circleRadius = 154
  const circumference = 2 * Math.PI * circleRadius

  useEffect(() => {
    audioRef.current = new FocusAudioEngine()
    const raw = window.localStorage.getItem(FOCUS_TIMER_STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as PersistedFocusTimer
        if (saved.version === 1 && ['running', 'paused'].includes(saved.phase)) {
          window.setTimeout(() => { setInterrupted(saved); setModal('interrupted') }, 0)
        }
      } catch { window.localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY) }
    }
    return () => audioRef.current?.stop()
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (!isActive || !startedAt) return
    const payload: PersistedFocusTimer = { version: 1, taskLabel, timerType, plannedDurationSeconds: plannedSeconds, elapsedBeforeRun, runStartedAt, startedAt, phase: phase as 'running' | 'paused' }
    window.localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(payload))
  }, [elapsedBeforeRun, isActive, phase, plannedSeconds, runStartedAt, startedAt, taskLabel, timerType])

  const finishSession = useCallback((naturalCompletion: boolean) => {
    if (finishingRef.current || !startedAt) return
    finishingRef.current = true
    const rawElapsed = elapsedBeforeRun + (phase === 'running' && runStartedAt ? (Date.now() - runStartedAt) / 1000 : 0)
    const actualDurationSeconds = Math.min(12 * 60 * 60, Math.max(1, Math.floor(naturalCompletion && timerType === 'countdown' ? plannedSeconds : rawElapsed)))
    const completed = timerType === 'countdown' ? naturalCompletion : actualDurationSeconds >= 5 * 60
    const xpAwarded = calculateFocusXP(actualDurationSeconds, completed, timerType)
    const session: FocusSession = {
      id: ensureUUID(), taskLabel: taskLabel.trim() || 'Odak oturumu', timerType,
      plannedDurationSeconds: timerType === 'countdown' ? plannedSeconds : 0,
      actualDurationSeconds, startedAt, endedAt: new Date().toISOString(), completed, xpAwarded,
    }
    store.addFocusSession(session)
    if (xpAwarded > 0) {
      store.addXP(xpAwarded)
      store.updateStreak()
      void recordXpEvent({ sourceType: 'focus', sourceId: session.id, label: `${session.taskLabel} odak oturumu`, amount: xpAwarded })
    }
    audioRef.current?.stop()
    audioRef.current?.beep(820, .28)
    window.localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY)
    setElapsedBeforeRun(actualDurationSeconds)
    setRunStartedAt(null)
    setPhase('finished')
    setLastSession(session)
    setModal('journal')
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('SAH · Odak oturumu tamamlandı', { body: `${session.taskLabel} · ${formatFocusDuration(actualDurationSeconds)}`, icon: '/favicon.ico' })
    }
    window.setTimeout(() => { finishingRef.current = false }, 300)
  }, [elapsedBeforeRun, phase, plannedSeconds, runStartedAt, startedAt, store, taskLabel, timerType])

  useEffect(() => {
    if (phase === 'running' && timerType === 'countdown' && elapsedSeconds >= plannedSeconds) finishSession(true)
  }, [elapsedSeconds, finishSession, phase, plannedSeconds, timerType])

  useEffect(() => {
    if (phase !== 'running' || sound !== 'countdown' || timerType !== 'countdown') return
    const remaining = Math.ceil(displaySeconds)
    if (remaining <= 0 || remaining > 5 || lastBeepSecondRef.current === remaining) return
    lastBeepSecondRef.current = remaining
    audioRef.current?.beep(remaining === 1 ? 940 : 680, .09)
  }, [displaySeconds, phase, sound, timerType])

  const requestNotifications = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch {}
    }
  }

  const start = async () => {
    if (!taskLabel.trim()) return
    const timestamp = Date.now()
    setStartedAt(new Date(timestamp).toISOString())
    setRunStartedAt(timestamp)
    setElapsedBeforeRun(0)
    setNow(timestamp)
    setPhase('running')
    setLastSession(null)
    lastBeepSecondRef.current = null
    await requestNotifications()
    await audioRef.current?.start(sound, volume)
  }

  const pause = () => {
    if (!runStartedAt) return
    setElapsedBeforeRun((value) => value + Math.max(0, (Date.now() - runStartedAt) / 1000))
    setRunStartedAt(null)
    setPhase('paused')
    audioRef.current?.stop()
  }

  const resume = async () => {
    setRunStartedAt(Date.now())
    setNow(Date.now())
    setPhase('running')
    await audioRef.current?.start(sound, volume)
  }

  const requestStop = () => elapsedSeconds >= 60 ? setModal('stop') : finishSession(false)

  const reset = () => {
    setPhase('idle'); setElapsedBeforeRun(0); setRunStartedAt(null); setStartedAt(null); setLastSession(null)
    finishingRef.current = false
  }

  const attachTask = () => {
    const clean = taskDraft.trim().slice(0, 120)
    if (!clean) return
    setTaskLabel(clean); setTaskDraft('')
  }

  const openTimerModal = () => { setDraftTimerType(timerType); setDraftMinutes(plannedMinutes); setModal('timer-type') }
  const openSoundModal = () => { setDraftSound(sound); setDraftVolume(volume); setModal('sound') }
  const confirmSound = async () => {
    setSound(draftSound); setVolume(draftVolume); setModal(null)
    if (phase === 'running') await audioRef.current?.start(draftSound, draftVolume)
  }
  const logToJournal = () => {
    if (!lastSession) return
    const note = `🎯 ${Math.max(1, Math.round(lastSession.actualDurationSeconds / 60))} dakika odaklanıldı: ${lastSession.taskLabel}`
    store.logFocusToJournal(lastSession.id, note)
    setLastSession({ ...lastSession, linkedJournalEntryId: 'linked' })
    setModal(null)
  }

  const resumeInterrupted = async () => {
    if (!interrupted) return
    const backgroundElapsed = interrupted.phase === 'running' && interrupted.runStartedAt ? (Date.now() - interrupted.runStartedAt) / 1000 : 0
    const recoveredElapsed = interrupted.elapsedBeforeRun + Math.max(0, backgroundElapsed)
    setTaskLabel(interrupted.taskLabel)
    setTimerType(interrupted.timerType)
    setPlannedMinutes(Math.max(1, Math.round(interrupted.plannedDurationSeconds / 60)))
    setStartedAt(interrupted.startedAt)
    setElapsedBeforeRun(recoveredElapsed)
    setRunStartedAt(Date.now())
    setNow(Date.now())
    setPhase('running')
    setModal(null)
    setInterrupted(null)
    await audioRef.current?.start(sound, volume)
  }

  const discardInterrupted = () => {
    window.localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY)
    setInterrupted(null); setModal(null); reset()
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {}
  }

  const popOut = () => window.open(`${window.location.origin}/?focus=1`, 'sah-focus-timer', 'popup,width=1180,height=820')

  const soundLabel = FOCUS_SOUNDS.find((item) => item.id === sound)?.label ?? 'Hiçbiri'
  const dialLabel = phase === 'finished' ? 'Oturum tamamlandı' : phase === 'running' ? 'Derin odak' : phase === 'paused' ? 'Kısa bir nefes' : timerType === 'countdown' ? `${plannedMinutes} dakikalık alan` : 'Serbest odak'
  const tickMarks = useMemo(() => Array.from({ length: 60 }, (_, index) => index), [])

  return <div className={`focus-shell ${timelineOpen ? 'with-timeline' : ''}`}>
    <div className="focus-background" aria-hidden />
    <main className="focus-stage">
      <header className="focus-topbar">
        <div className="focus-window-actions"><button onClick={onExit} aria-label="Odak ekranını küçült"><AppIcon name="chevron-down" /></button><button onClick={popOut} aria-label="Odak ekranını ayrı pencerede aç"><AppIcon name="external-link" /></button></div>
        <div className="focus-task-slot">
          {taskLabel ? <span className="focus-task-chip"><i /><strong>{taskLabel}</strong>{isActive && <b aria-label="Oturum etkin" />} {!isActive && <button onClick={() => setTaskLabel('')} aria-label="Görevi ayır">×</button>}</span> : <form onSubmit={(event) => { event.preventDefault(); attachTask() }}><span><AppIcon name="target-arrow" /></span><input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={120} placeholder="Şu an neye odaklanacaksın?" aria-label="Odak görevi" /><button type="submit">Ekle</button></form>}
        </div>
        <button className="focus-timeline-toggle" onClick={() => setTimelineOpen((value) => !value)} aria-expanded={timelineOpen} aria-label="Bugünün kayıtlarını aç veya kapat"><AppIcon name={timelineOpen ? 'layout-sidebar-right-collapse' : 'layout-sidebar-right-expand'} /></button>
      </header>

      <section className="focus-center" aria-live="polite">
        <span className="focus-mode-eyebrow"><i className={phase === 'running' ? 'live' : ''} /> {dialLabel}</span>
        <div className="focus-dial" aria-label={`${formatTimer(displaySeconds)} kaldı`}>
          <svg viewBox="0 0 360 360" aria-hidden>
            <g className="focus-ticks">{tickMarks.map((tick) => <line key={tick} x1="180" y1={tick % 5 === 0 ? 10 : 15} x2="180" y2={tick % 5 === 0 ? 23 : 20} transform={`rotate(${tick * 6} 180 180)`} />)}</g>
            <circle className="focus-progress-track" cx="180" cy="180" r={circleRadius} />
            <circle className="focus-progress-ring" cx="180" cy="180" r={circleRadius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <div><strong>{formatTimer(displaySeconds)}</strong><span>{timerType === 'countdown' ? 'GERİ SAYIM' : 'SERBEST ZAMAN'}</span></div>
        </div>

        <div className="focus-primary-actions">
          {phase === 'idle' && <button className="focus-start-button" onClick={() => void start()} disabled={!taskLabel}><AppIcon name="player-play-filled" /> Odaklanmaya Başlayın</button>}
          {phase === 'running' && <button className="focus-start-button pause" onClick={pause}><AppIcon name="player-pause-filled" /> Duraklat</button>}
          {phase === 'paused' && <button className="focus-start-button" onClick={() => void resume()}><AppIcon name="player-play-filled" /> Devam Et</button>}
          {phase === 'finished' && <button className="focus-start-button" onClick={reset}><AppIcon name="refresh" /> Yeni Oturum</button>}
          {isActive && <button className="focus-stop-button" onClick={requestStop}><AppIcon name="player-stop-filled" /> Oturumu bitir</button>}
          {!taskLabel && phase === 'idle' && <small>Başlamak için önce odaklanacağın şeyi yaz.</small>}
        </div>

        <nav className="focus-controls" aria-label="Zamanlayıcı ayarları">
          <button onClick={() => void toggleFullscreen()}><span><AppIcon name="maximize" /></span><strong>Tam Ekran</strong><small>Dikkat dağıtanları gizle</small></button>
          <button onClick={openTimerModal} disabled={isActive}><span><AppIcon name="hourglass" /></span><strong>Zamanlayıcı Türü</strong><small>{timerType === 'countdown' ? `${plannedMinutes}:00 geri sayım` : 'Serbest sayaç'}</small></button>
          <button onClick={openSoundModal}><span><AppIcon name="headphones" /></span><strong>Arka Plan Sesi</strong><small>{soundLabel}</small></button>
        </nav>
      </section>
      <p className="focus-privacy"><AppIcon name="shield-lock" /> Oturumların yalnızca sana görünür. Sayaç arka planda da gerçek zamanla ilerler.</p>
    </main>

    <AnimatePresence>{timelineOpen && <motion.aside className="focus-side-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}><FocusTimeline sessions={store.focusSessions} /><button className="focus-side-close" onClick={() => setTimelineOpen(false)} aria-label="Kayıt panelini kapat"><AppIcon name="chevron-right" /></button></motion.aside>}</AnimatePresence>

    <AnimatePresence>
      {modal === 'timer-type' && <FocusModal title="Zamanlayıcı Türü" onClose={() => setModal(null)}>
        <div className="timer-type-options">
          <button className={draftTimerType === 'countdown' ? 'selected' : ''} onClick={() => setDraftTimerType('countdown')}><span><strong>{draftMinutes}:00 → 00:00</strong><small>{draftMinutes}:00&apos;dan zamanın sonuna kadar geri sayım.</small></span><AppIcon name={draftTimerType === 'countdown' ? 'circle-check-filled' : 'circle'} /></button>
          {draftTimerType === 'countdown' && <div className="duration-picker"><span>Tercih edilen süre</span><div>{[25, 50].map((minutes) => <button key={minutes} className={draftMinutes === minutes ? 'active' : ''} onClick={() => setDraftMinutes(minutes)}>{minutes} dk</button>)}<label><input type="number" min="1" max="180" value={draftMinutes} onChange={(event) => setDraftMinutes(Math.min(180, Math.max(1, Number(event.target.value) || 1)))} /><span>dk</span></label></div></div>}
          <button className={draftTimerType === 'stopwatch' ? 'selected' : ''} onClick={() => setDraftTimerType('stopwatch')}><span><strong>00:00 → ∞</strong><small>00:00&apos;dan başla durdurana kadar devam et.</small></span><AppIcon name={draftTimerType === 'stopwatch' ? 'circle-check-filled' : 'circle'} /></button>
        </div>
        <ModalActions onCancel={() => setModal(null)} onConfirm={() => { setTimerType(draftTimerType); setPlannedMinutes(draftMinutes); setElapsedBeforeRun(0); setModal(null) }} />
      </FocusModal>}

      {modal === 'sound' && <FocusModal title="Arka Plan Sesi" onClose={() => setModal(null)}>
        <label className="focus-volume"><span><strong>Ses Seviyesi</strong><small>{Math.round(draftVolume * 100)}%</small></span><input type="range" min="0" max="1" step="0.01" value={draftVolume} onChange={(event) => { const next = Number(event.target.value); setDraftVolume(next); audioRef.current?.setVolume(next) }} /></label>
        <div className="focus-sound-list">{FOCUS_SOUNDS.map((item) => <button key={item.id} className={draftSound === item.id ? 'selected' : ''} onClick={() => setDraftSound(item.id)}><span><AppIcon name={item.icon} /></span><div><strong>{item.label}</strong><small>{item.note}</small></div><AppIcon name={draftSound === item.id ? 'circle-check-filled' : 'circle'} /></button>)}</div>
        <p className="focus-audio-note"><AppIcon name="sparkles" /> Ortam sesleri cihazında Web Audio ile üretilir; harici ses kaynağına veri gönderilmez.</p>
        <ModalActions onCancel={() => setModal(null)} onConfirm={() => void confirmSound()} />
      </FocusModal>}

      {modal === 'stop' && <FocusModal title="Oturumu şimdi bitir?" onClose={() => setModal(null)} compact>
        <div className="focus-confirm-message"><span><AppIcon name="clock-pause" /></span><p><strong>{formatFocusDuration(elapsedSeconds)} boyunca odaktaydın.</strong> Bu süre kısmi oturum olarak kaydedilecek; tamamlanan oturuma göre daha az XP verebilir.</p></div>
        <ModalActions onCancel={() => setModal(null)} cancelLabel="Devam et" confirmLabel="Bitir ve kaydet" onConfirm={() => { setModal(null); finishSession(false) }} danger />
      </FocusModal>}

      {modal === 'journal' && lastSession && <FocusModal title="Odağından günlüğüne bir iz bırak" onClose={() => setModal(null)} compact>
        <div className="focus-complete-summary"><span><AppIcon name="target-arrow" /></span><div><strong>{lastSession.taskLabel}</strong><p>{formatFocusDuration(lastSession.actualDurationSeconds)} odak · +{lastSession.xpAwarded} XP</p></div></div>
        <p className="journal-offer-copy">Bugünün Günlük kaydına “🎯 {Math.max(1, Math.round(lastSession.actualDurationSeconds / 60))} dakika odaklanıldı: {lastSession.taskLabel}” notunu ekleyelim mi?</p>
        <ModalActions onCancel={() => setModal(null)} cancelLabel="Şimdi değil" confirmLabel="Günlüğe ekle" onConfirm={logToJournal} />
      </FocusModal>}

      {modal === 'interrupted' && interrupted && <FocusModal title="Yarım kalan odağın bulundu" onClose={discardInterrupted} compact>
        <div className="focus-confirm-message"><span><AppIcon name="restore" /></span><p><strong>{interrupted.taskLabel}</strong> oturumu kapanmadan önce aktifti. Gerçek zaman hesabıyla kaldığın yerden devam edebilir veya bu taslağı silebilirsin.</p></div>
        <ModalActions onCancel={discardInterrupted} cancelLabel="Taslağı sil" confirmLabel="Devam et" onConfirm={() => void resumeInterrupted()} />
      </FocusModal>}
    </AnimatePresence>
  </div>
}

function FocusModal({ title, onClose, compact = false, children }: { title: string; onClose: () => void; compact?: boolean; children: React.ReactNode }) {
  return <motion.div className="focus-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.section className={`focus-modal ${compact ? 'compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby="focus-modal-title" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .99 }}>
      <header><h2 id="focus-modal-title">{title}</h2><button onClick={onClose} aria-label="Pencereyi kapat"><AppIcon name="x" /></button></header>{children}
    </motion.section>
  </motion.div>
}

function ModalActions({ onCancel, onConfirm, cancelLabel = 'İptal', confirmLabel = 'Onayla', danger = false }: { onCancel: () => void; onConfirm: () => void; cancelLabel?: string; confirmLabel?: string; danger?: boolean }) {
  return <footer className="focus-modal-actions"><button onClick={onCancel}>{cancelLabel}</button><button className={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</button></footer>
}
