'use client'

import { useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { focusDayKey, getFocusHistoryStats } from '@/lib/focusInsights'
import { formatFocusDuration } from '@/lib/focus'
import type { FocusSession } from '@/types'
import FocusTimeline from './FocusTimeline'

export default function FocusHistoryDashboard({ sessions, onOpenJournal }: { sessions: FocusSession[]; onOpenJournal: (date: string) => void }) {
  const [query, setQuery] = useState('')
  const [quality, setQuality] = useState('all')
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const stats = useMemo(() => getFocusHistoryStats(sessions), [sessions])
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const daySessions = sessions.filter((session) => focusDayKey(session.startedAt) === focusDayKey(date))
    return { date, seconds: daySessions.reduce((sum, session) => sum + session.actualDurationSeconds, 0), count: daySessions.length }
  }), [sessions])
  const maxWeek = Math.max(1, ...week.map((day) => day.seconds))
  const filtered = sessions.filter((session) => {
    const haystack = `${session.taskLabel} ${session.intentionText ?? ''} ${session.postSessionNote ?? ''}`.toLocaleLowerCase('tr')
    return haystack.includes(query.toLocaleLowerCase('tr')) && (quality === 'all' || session.focusQualityRating === Number(quality))
  })

  return <section className="focus-history-dashboard">
    <header className="focus-history-heading"><div><span className="eyebrow">ODAK GEÇMİŞİ</span><h1>Ritmini gör, iyi çalışanı koru.</h1><p>Kalite, süre ve kesintileri birlikte değerlendir; amaç daha uzun değil, daha nitelikli odaklanmak.</p></div></header>
    <div className="focus-history-stats">
      <Stat icon="clock-hour-4" label="Toplam odak" value={formatFocusDuration(stats.lifetimeSeconds)} />
      <Stat icon="trophy" label="En iyi gün" value={formatFocusDuration(stats.bestDaySeconds)} />
      <Stat icon="flame" label="Odak serisi" value={`${stats.currentStreak} gün`} />
      <Stat icon="sparkles" label="Ortalama kalite" value={stats.averageQuality ? `${stats.averageQuality.toFixed(1)} / 5` : 'Henüz yok'} note={stats.qualityTrend === null ? undefined : `${stats.qualityTrend >= 0 ? '+' : ''}${stats.qualityTrend.toFixed(1)} son dönem`} />
      <Stat icon="shield-check" label="Kesintisiz oran" value={`${Math.round(stats.interruptionFreeRate * 100)}%`} />
    </div>
    <div className="focus-history-grid">
      <article className="focus-week-card">
        <header><div><span className="eyebrow">SON 7 GÜN</span><h2>Haftalık odak</h2></div><small>Bir güne dokunarak akışı incele</small></header>
        <div className="focus-week-bars">
          {week.map((day) => <button key={focusDayKey(day.date)} className={focusDayKey(day.date) === focusDayKey(selectedDay) ? 'selected' : ''} onClick={() => setSelectedDay(day.date)} aria-label={`${day.date.toLocaleDateString('tr-TR')} ${formatFocusDuration(day.seconds)}`}>
            <strong>{day.seconds ? formatFocusDuration(day.seconds) : '—'}</strong><i><span style={{ height: `${Math.max(day.seconds ? 8 : 0, day.seconds / maxWeek * 100)}%` }} /></i><small>{day.date.toLocaleDateString('tr-TR', { weekday: 'short' })}</small>
          </button>)}
        </div>
      </article>
      <FocusTimeline sessions={sessions} compact referenceDate={selectedDay} />
    </div>
    <article className="focus-session-history">
      <header><div><span className="eyebrow">TÜM OTURUMLAR</span><h2>Geçmişim</h2></div><div className="focus-history-filters"><label><AppIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Görev veya not ara" /></label><select value={quality} onChange={(event) => setQuality(event.target.value)} aria-label="Kaliteye göre filtrele"><option value="all">Tüm kaliteler</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}/5 kalite</option>)}</select></div></header>
      <div className="focus-session-list">
        {filtered.map((session) => <article key={session.id}>
          <span className="focus-session-quality">{session.focusQualityRating ? `${session.focusQualityRating}/5` : '—'}</span>
          <div><strong>{session.taskLabel}</strong><p>{new Date(session.startedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {new Date(session.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>{session.intentionText && <small>Hedef: {session.intentionText}</small>}{session.postSessionNote && <small>Not: {session.postSessionNote}</small>}</div>
          <div className="focus-session-meta"><span><AppIcon name="clock" /> {formatFocusDuration(session.actualDurationSeconds)}</span><span><AppIcon name="arrow-back-up" /> {session.interruptionCount ?? 0} kesinti</span>{session.linkedJournalEntryId ? <button onClick={() => onOpenJournal(focusDayKey(session.startedAt))}><AppIcon name="notebook" /> Günlüğe git</button> : <span className="not-linked"><AppIcon name="unlink" /> Günlüğe eklenmedi</span>}</div>
        </article>)}
        {!filtered.length && <div className="focus-history-empty"><AppIcon name="search-off" /><strong>Eşleşen oturum bulunamadı</strong><p>Filtreyi değiştir veya yeni bir odak oturumu başlat.</p></div>}
      </div>
    </article>
  </section>
}

function Stat({ icon, label, value, note }: { icon: string; label: string; value: string; note?: string }) {
  return <article><span><AppIcon name={icon} /></span><div><small>{label}</small><strong>{value}</strong>{note && <em>{note}</em>}</div></article>
}
