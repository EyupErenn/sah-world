'use client'

import { AppIcon } from '@/components/ui/AppIcon'
import { formatFocusDuration, isSameLocalDay } from '@/lib/focus'
import type { FocusSession } from '@/types'

export default function FocusTimeline({ sessions, compact = false, referenceDate }: { sessions: FocusSession[]; compact?: boolean; referenceDate?: Date }) {
  const now = referenceDate ?? new Date()
  const todaySessions = sessions.filter((session) => isSameLocalDay(session.startedAt, now)).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
  const total = todaySessions.reduce((sum, session) => sum + session.actualDurationSeconds, 0)
  const firstSessionHour = todaySessions.length ? new Date(todaySessions[0].startedAt).getHours() : now.getHours() - 2
  const lastSessionHour = todaySessions.length ? new Date(todaySessions.at(-1)!.endedAt).getHours() + 1 : now.getHours() + 2
  const startHour = Math.max(0, Math.min(firstSessionHour, now.getHours() - 2))
  const endHour = Math.min(24, Math.max(lastSessionHour, startHour + (compact ? 5 : 7)))
  const rangeMinutes = Math.max(60, (endHour - startHour) * 60)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)

  const dateLabel = isSameLocalDay(now, new Date()) ? 'BUGÜNÜN ODAK KAYITLARI' : now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }).toLocaleUpperCase('tr')
  return <section className={`focus-timeline ${compact ? 'compact' : ''}`} aria-label={`${dateLabel} odaklanma süresi kayıtları`}>
    <header><div><span className="eyebrow">{dateLabel}</span><h2>Odaklanma akışın</h2></div><span className="focus-total-chip"><AppIcon name="clock-hour-4" /> {formatFocusDuration(total)}</span></header>
    <div className="focus-total-track" aria-label={`Toplam ${formatFocusDuration(total)} odaklanıldı`}><i style={{ width: `${Math.min(100, total / (4 * 60 * 60) * 100)}%` }} /></div>
    <div className="focus-timeline-canvas" style={{ '--timeline-hours': String(Math.max(1, endHour - startHour)) } as React.CSSProperties}>
      {hours.map((hour, index) => <div className="focus-hour-line" key={hour} style={{ top: `${index / Math.max(1, hours.length - 1) * 100}%` }}><span>{String(hour).padStart(2, '0')}:00</span><i /></div>)}
      {todaySessions.map((session, index) => {
        const start = new Date(session.startedAt)
        const offsetMinutes = (start.getHours() - startHour) * 60 + start.getMinutes()
        const top = Math.max(0, Math.min(98, offsetMinutes / rangeMinutes * 100))
        const height = Math.max(compact ? 7 : 5, Math.min(34, session.actualDurationSeconds / 60 / rangeMinutes * 100))
        return <article key={session.id} className={`focus-session-block tone-${index % 4}`} style={{ top: `${top}%`, height: `${height}%`, opacity: session.focusQualityRating ? .55 + session.focusQualityRating * .09 : .86 }} title={`${session.taskLabel} · ${formatFocusDuration(session.actualDurationSeconds)}`}>
          <strong>{session.taskLabel}</strong><span>{formatFocusDuration(session.actualDurationSeconds)}{session.focusQualityRating ? ` · ${session.focusQualityRating}/5` : ''}</span>
        </article>
      })}
      {!todaySessions.length && <div className="focus-timeline-empty"><AppIcon name="clock-pause" /><strong>Bugünün ilk sakin bloğu hazır</strong><p>Başlattığın odak oturumu burada günün içindeki yerine yerleşecek.</p></div>}
    </div>
  </section>
}
