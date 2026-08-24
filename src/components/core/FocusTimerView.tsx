'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import FocusTimeline from './FocusTimeline'
import { AppIcon } from '@/components/ui/AppIcon'
import { useJourneyStore } from '@/store/useJourneyStore'
import { getFocusDisplaySeconds, getFocusElapsedSeconds, useFocusTimerStore } from '@/store/useFocusTimerStore'
import { formatFocusDuration, formatTimer } from '@/lib/focus'
import { FocusAudioEngine, FOCUS_SOUNDS, type FocusSoundId } from '@/lib/focusAudio'
import { finalizeFocusSession } from '@/lib/focusRuntime'
import type { FocusTimerType } from '@/types'

type Modal = 'timer-type' | 'sound' | 'stop' | null

export default function FocusTimerView({ onExit }: { onExit: () => void }) {
  const journey = useJourneyStore()
  const timer = useFocusTimerStore()
  const [taskDraft, setTaskDraft] = useState('')
  const [now, setNow] = useState(0)
  const [modal, setModal] = useState<Modal>(null)
  const [draftTimerType, setDraftTimerType] = useState<FocusTimerType>(timer.timerType)
  const [draftDurationSeconds, setDraftDurationSeconds] = useState(timer.plannedDurationSeconds || 50 * 60)
  const [draftSound, setDraftSound] = useState<FocusSoundId>(timer.sound)
  const [draftVolume, setDraftVolume] = useState(timer.volume)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const lastBeepSecondRef = useRef<number | null>(null)
  const audioRef = useRef<FocusAudioEngine | null>(null)
  const clockNow = now || timer.startedAt || timer.sessionStartedAt || 0
  const elapsedSeconds = getFocusElapsedSeconds(timer, clockNow)
  const displaySeconds = getFocusDisplaySeconds(timer, clockNow)
  const progress = timer.timerType === 'countdown'
    ? Math.min(1, elapsedSeconds / Math.max(1, timer.plannedDurationSeconds))
    : (elapsedSeconds % 3600) / 3600
  const phase = timer.isActive ? (timer.isPaused ? 'paused' : 'running') : timer.completedSession ? 'finished' : 'idle'
  const circleRadius = 154
  const circumference = 2 * Math.PI * circleRadius

  useEffect(() => {
    timer.setFullscreen(true)
    audioRef.current = new FocusAudioEngine()
    return () => {
      audioRef.current?.stop()
    }
    // Minimise explicitly releases fullscreen ownership. The exit animation must
    // not clear a newer expand action that may already have occurred.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!timer.isActive || timer.isPaused) return
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(tick)
  }, [timer.isActive, timer.isPaused])

  useEffect(() => {
    if (!timer.isActive || timer.isPaused || timer.sound !== 'countdown' || timer.timerType !== 'countdown') return
    const remaining = Math.ceil(displaySeconds)
    if (remaining <= 0 || remaining > 5 || lastBeepSecondRef.current === remaining) return
    lastBeepSecondRef.current = remaining
    audioRef.current?.beep(remaining === 1 ? 940 : 680, .09)
  }, [displaySeconds, timer.isActive, timer.isPaused, timer.sound, timer.timerType])

  const requestNotifications = async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch {}
    }
  }

  const start = async () => {
    if (!timer.taskLabel.trim()) return
    lastBeepSecondRef.current = null
    timer.start()
    await requestNotifications()
    await audioRef.current?.start(timer.sound, timer.volume)
  }
  const pause = () => { timer.pause(); audioRef.current?.stop() }
  const resume = async () => { timer.resume(); await audioRef.current?.start(timer.sound, timer.volume) }
  const requestStop = () => elapsedSeconds >= 60 ? setModal('stop') : finalizeFocusSession(false)
  const reset = () => { timer.reset(); lastBeepSecondRef.current = null }
  const minimise = () => { timer.setFullscreen(false); onExit() }
  const attachTask = () => {
    const clean = taskDraft.trim().slice(0, 120)
    if (!clean) return
    timer.setTaskLabel(clean)
    setTaskDraft('')
  }
  const openTimerModal = () => {
    setDraftTimerType(timer.timerType)
    setDraftDurationSeconds(timer.plannedDurationSeconds || 50 * 60)
    setModal('timer-type')
  }
  const openSoundModal = () => {
    setDraftSound(timer.sound)
    setDraftVolume(timer.volume)
    setModal('sound')
  }
  const confirmSound = async () => {
    timer.setSound(draftSound, draftVolume)
    setModal(null)
    if (timer.isActive && !timer.isPaused) await audioRef.current?.start(draftSound, draftVolume)
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {}
  }
  const popOut = () => window.open(`${window.location.origin}/?focus=1`, 'sah-focus-timer', 'popup,width=1180,height=820')

  const durationLabel = timer.timerType === 'countdown'
    ? timer.plannedDurationSeconds < 60 ? `${timer.plannedDurationSeconds} saniyelik alan` : `${Math.round(timer.plannedDurationSeconds / 60)} dakikalık alan`
    : 'Serbest odak'
  const soundLabel = FOCUS_SOUNDS.find((item) => item.id === timer.sound)?.label ?? 'Hiçbiri'
  const dialLabel = phase === 'finished' ? 'Oturum tamamlandı' : phase === 'running' ? 'Derin odak' : phase === 'paused' ? 'Kısa bir nefes' : durationLabel
  const tickMarks = useMemo(() => Array.from({ length: 60 }, (_, index) => index), [])

  return <div className={`focus-shell ${timelineOpen ? 'with-timeline' : ''}`}>
    <div className="focus-background" aria-hidden />
    <main className="focus-stage">
      <header className="focus-topbar">
        <div className="focus-window-actions"><button onClick={minimise} aria-label="Odak ekranını küçült"><AppIcon name="chevron-down" /></button><button onClick={popOut} aria-label="Odak ekranını ayrı pencerede aç"><AppIcon name="external-link" /></button></div>
        <div className="focus-task-slot">
          {timer.taskLabel ? <span className="focus-task-chip"><i /><strong>{timer.taskLabel}</strong>{timer.isActive && <b aria-label="Oturum etkin" />} {!timer.isActive && <button onClick={() => timer.setTaskLabel('')} aria-label="Görevi ayır">×</button>}</span> : <form onSubmit={(event) => { event.preventDefault(); attachTask() }}><span><AppIcon name="target-arrow" /></span><input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={120} placeholder="Şu an neye odaklanacaksın?" aria-label="Odak görevi" /><button type="submit">Ekle</button></form>}
        </div>
        <button className="focus-timeline-toggle" onClick={() => setTimelineOpen((value) => !value)} aria-expanded={timelineOpen} aria-label="Bugünün kayıtlarını aç veya kapat"><AppIcon name={timelineOpen ? 'layout-sidebar-right-collapse' : 'layout-sidebar-right-expand'} /></button>
      </header>

      <section className="focus-center" aria-live="polite">
        <span className="focus-mode-eyebrow"><i className={phase === 'running' ? 'live' : ''} /> {dialLabel}</span>
        <div className="focus-dial" aria-label={timer.timerType === 'countdown' ? `${formatTimer(displaySeconds)} kaldı` : `${formatTimer(displaySeconds)} geçti`}>
          <svg viewBox="0 0 360 360" aria-hidden>
            <g className="focus-ticks">{tickMarks.map((tick) => <line key={tick} x1="180" y1={tick % 5 === 0 ? 10 : 15} x2="180" y2={tick % 5 === 0 ? 23 : 20} transform={`rotate(${tick * 6} 180 180)`} />)}</g>
            <circle className="focus-progress-track" cx="180" cy="180" r={circleRadius} />
            <circle className="focus-progress-ring" cx="180" cy="180" r={circleRadius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <div><strong>{formatTimer(displaySeconds)}</strong><span>{timer.timerType === 'countdown' ? 'GERİ SAYIM' : 'SERBEST ZAMAN'}</span></div>
        </div>

        <div className="focus-primary-actions">
          {phase === 'idle' && <button className="focus-start-button" onClick={() => void start()} disabled={!timer.taskLabel}><AppIcon name="player-play-filled" /> Odaklanmaya Başlayın</button>}
          {phase === 'running' && <button className="focus-start-button pause" onClick={pause}><AppIcon name="player-pause-filled" /> Duraklat</button>}
          {phase === 'paused' && <button className="focus-start-button" onClick={() => void resume()}><AppIcon name="player-play-filled" /> Devam Et</button>}
          {phase === 'finished' && <button className="focus-start-button" onClick={reset}><AppIcon name="refresh" /> Yeni Oturum</button>}
          {timer.isActive && <button className="focus-stop-button" onClick={requestStop}><AppIcon name="player-stop-filled" /> Oturumu bitir</button>}
          {!timer.taskLabel && phase === 'idle' && <small>Başlamak için önce odaklanacağın şeyi yaz.</small>}
        </div>

        <nav className="focus-controls" aria-label="Zamanlayıcı ayarları">
          <button onClick={() => void toggleFullscreen()}><span><AppIcon name="maximize" /></span><strong>Tam Ekran</strong><small>Dikkat dağıtanları gizle</small></button>
          <button onClick={openTimerModal} disabled={timer.isActive}><span><AppIcon name="hourglass" /></span><strong>Zamanlayıcı Türü</strong><small>{durationLabel}</small></button>
          <button onClick={openSoundModal}><span><AppIcon name="headphones" /></span><strong>Arka Plan Sesi</strong><small>{soundLabel}</small></button>
        </nav>
      </section>
      <p className="focus-privacy"><AppIcon name="shield-lock" /> Oturumun kök uygulamada yaşar; sayfa değiştirsen veya yenilesen de gerçek zamanla devam eder.</p>
    </main>

    <AnimatePresence>{timelineOpen && <motion.aside className="focus-side-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}><FocusTimeline sessions={journey.focusSessions} /><button className="focus-side-close" onClick={() => setTimelineOpen(false)} aria-label="Kayıt panelini kapat"><AppIcon name="chevron-right" /></button></motion.aside>}</AnimatePresence>

    <AnimatePresence>
      {modal === 'timer-type' && <FocusModal title="Zamanlayıcı Türü" onClose={() => setModal(null)}>
        <div className="timer-type-options">
          <button className={draftTimerType === 'countdown' ? 'selected' : ''} onClick={() => setDraftTimerType('countdown')}><span><strong>{formatTimer(draftDurationSeconds)} → 00:00</strong><small>Seçtiğin süreden zamanın sonuna kadar geri sayım.</small></span><AppIcon name={draftTimerType === 'countdown' ? 'circle-check-filled' : 'circle'} /></button>
          {draftTimerType === 'countdown' && <div className="duration-picker"><span>Tercih edilen süre</span><div>{[25, 50].map((minutes) => <button key={minutes} className={draftDurationSeconds === minutes * 60 ? 'active' : ''} onClick={() => setDraftDurationSeconds(minutes * 60)}>{minutes} dk</button>)}<label><input type="number" min="1" max="180" value={Math.max(1, Math.round(draftDurationSeconds / 60))} onChange={(event) => setDraftDurationSeconds(Math.min(180, Math.max(1, Number(event.target.value) || 1)) * 60)} /><span>dk</span></label>{process.env.NODE_ENV === 'development' && <button className={draftDurationSeconds === 15 ? 'active' : ''} onClick={() => setDraftDurationSeconds(15)}>15 sn test</button>}</div></div>}
          <button className={draftTimerType === 'stopwatch' ? 'selected' : ''} onClick={() => setDraftTimerType('stopwatch')}><span><strong>00:00 → ∞</strong><small>00:00&apos;dan başla durdurana kadar devam et.</small></span><AppIcon name={draftTimerType === 'stopwatch' ? 'circle-check-filled' : 'circle'} /></button>
        </div>
        <ModalActions onCancel={() => setModal(null)} onConfirm={() => { timer.configure({ timerType: draftTimerType, plannedDurationSeconds: draftDurationSeconds }); setModal(null) }} />
      </FocusModal>}

      {modal === 'sound' && <FocusModal title="Arka Plan Sesi" onClose={() => setModal(null)}>
        <label className="focus-volume"><span><strong>Ses Seviyesi</strong><small>{Math.round(draftVolume * 100)}%</small></span><input type="range" min="0" max="1" step="0.01" value={draftVolume} onChange={(event) => { const next = Number(event.target.value); setDraftVolume(next); audioRef.current?.setVolume(next) }} /></label>
        <div className="focus-sound-list">{FOCUS_SOUNDS.map((item) => <button key={item.id} className={draftSound === item.id ? 'selected' : ''} onClick={() => setDraftSound(item.id)}><span><AppIcon name={item.icon} /></span><div><strong>{item.label}</strong><small>{item.note}</small></div><AppIcon name={draftSound === item.id ? 'circle-check-filled' : 'circle'} /></button>)}</div>
        <p className="focus-audio-note"><AppIcon name="sparkles" /> Ortam sesleri cihazında Web Audio ile üretilir; harici ses kaynağına veri gönderilmez.</p>
        <ModalActions onCancel={() => setModal(null)} onConfirm={() => void confirmSound()} />
      </FocusModal>}

      {modal === 'stop' && <FocusModal title="Oturumu şimdi bitir?" onClose={() => setModal(null)} compact>
        <div className="focus-confirm-message"><span><AppIcon name="clock-pause" /></span><p><strong>{formatFocusDuration(elapsedSeconds)} boyunca odaktaydın.</strong> Bu süre kısmi oturum olarak kaydedilecek; tamamlanan oturuma göre daha az XP verebilir.</p></div>
        <ModalActions onCancel={() => setModal(null)} cancelLabel="Devam et" confirmLabel="Bitir ve kaydet" onConfirm={() => { setModal(null); finalizeFocusSession(false) }} danger />
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
