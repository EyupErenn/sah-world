'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { useActivityLog } from '@/hooks/useActivityLog'
import { buildActivityFeed, dayKey } from '@/lib/activity'
import { recordXpEvent } from '@/lib/xp'
import { useJourneyStore } from '@/store/useJourneyStore'
import type { IntegratedActivity, JournalEntry } from '@/types'

type Draft = {
  mood: number
  energy: number
  stress: number
  sleep: number
  content: string
  moments: string[]
  gratitude: string[]
  selfNote: string
}

type SectionId = 'wellbeing' | 'story' | 'moments' | 'gratitude' | 'self' | 'activity'

const todayKey = () => dayKey(new Date())
const emptyDraft = (): Draft => ({ mood: 3, energy: 7, stress: 3, sleep: 7, content: '', moments: ['', '', ''], gratitude: ['', '', ''], selfNote: '' })

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function moveDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return dayKey(date)
}

function sectionPages(activityCount: number): SectionId[][] {
  // Page boundaries stay stable while the user types. A long textarea grows
  // in place; it never disappears mid-sentence because a height estimate
  // moved its section to another page.
  return activityCount > 5
    ? [['wellbeing', 'story'], ['moments', 'gratitude', 'self'], ['activity']]
    : [['wellbeing', 'story'], ['moments', 'gratitude', 'self', 'activity']]
}

export default function JournalNotebook({ onNavigate }: { onNavigate: (view: string) => void }) {
  const store = useJourneyStore()
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const [page, setPage] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [notice, setNotice] = useState('')
  const entry = store.journal.find((item) => item.date === selectedDate)
  const gratitudeEntry = store.sukurList.find((item) => item.date === selectedDate)
  const isToday = selectedDate === today
  const activityQuery = useActivityLog(selectedDate, selectedDate)
  const localActivities = useMemo<IntegratedActivity[]>(() => buildActivityFeed(store)
    .filter((item) => dayKey(item.createdAt) === selectedDate)
    .map((item) => ({ id: item.id, category: item.category, label: item.label, detail: item.detail, xp: item.xp, occurredAt: item.createdAt, sourceView: item.category === 'profession' ? 'profession-school' : item.category })), [selectedDate, store])
  const activities = activityQuery.items.length ? activityQuery.items : localActivities
  const activitiesLoading = activityQuery.loading && localActivities.length === 0
  const trail = activities.filter((item) => item.category !== 'journal')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft({
        mood: entry?.mood ?? 3,
        energy: entry?.energy ?? 7,
        stress: entry?.stress ?? 3,
        sleep: entry?.sleep ?? 7,
        content: entry?.content ?? '',
        moments: entry?.moments?.length ? entry.moments : ['', '', ''],
        gratitude: gratitudeEntry?.nimets?.length ? gratitudeEntry.nimets : ['', '', ''],
        selfNote: entry?.selfNote ?? '',
      })
      setPage(0)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [entry, gratitudeEntry, selectedDate])

  const pages = useMemo(() => sectionPages(trail.length), [trail.length])
  const currentPage = Math.min(page, Math.max(0, pages.length - 1))

  const updateList = (key: 'moments' | 'gratitude', index: number, value: string) => {
    setDraft((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }))
  }

  const save = () => {
    if (!isToday) return
    const now = new Date().toISOString()
    const journalId = entry?.id ?? crypto.randomUUID()
    const hadPersonalContent = Boolean(entry && (entry.content.trim() || entry.selfNote?.trim() || entry.moments?.some((item) => item.trim())))
    const journal: JournalEntry = {
      id: journalId,
      date: today,
      mood: draft.mood,
      energy: draft.energy,
      stress: draft.stress,
      sleep: draft.sleep,
      content: draft.content.trim(),
      moments: draft.moments.map((item) => item.trim()).filter(Boolean),
      selfNote: draft.selfNote.trim(),
      tags: entry?.tags ?? [],
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    }
    store.saveJournal(journal)
    if (!hadPersonalContent) {
      store.addXP(25)
      store.updateStreak()
      void recordXpEvent({ sourceType: 'journal', sourceId: journalId, label: 'Yapılandırılmış günlük kaydı', amount: 25 })
    }

    const gratitude = draft.gratitude.map((item) => item.trim()).filter(Boolean)
    if (gratitude.length) {
      const gratitudeId = gratitudeEntry?.id ?? crypto.randomUUID()
      store.upsertSukur({
        id: gratitudeId,
        date: today,
        text: 'Günlük defterinden eklenen şükürler',
        nimets: [gratitude[0] ?? '', gratitude[1] ?? '', gratitude[2] ?? ''],
        createdAt: gratitudeEntry?.createdAt ?? now,
      })
      if (!gratitudeEntry) {
        store.addXP(20)
        void recordXpEvent({ sourceType: 'sukur', sourceId: gratitudeId, label: 'Günlükten şükür kaydı', amount: 20 })
      }
    }
    store.checkBadges()
    setNotice('Bugünün sayfası güvenle kaydedildi')
    window.setTimeout(() => setNotice(''), 3200)
  }

  const visibleSections = pages[currentPage] ?? []
  return <div className="journal-notebook">
    <header className="journal-hero">
      <div><span className="journal-kicker"><AppIcon name="book-2" /> KİŞİSEL DEFTERİN</span><h1>Gününü acele etmeden hatırla.</h1><p>Düşüncelerin, şükürlerin ve gün içindeki anlamlı adımların tek bir kalıcı sayfada buluşur.</p></div>
      <div className="journal-date-controls">
        <button onClick={() => setSelectedDate(moveDate(selectedDate, -1))} aria-label="Önceki gün"><AppIcon name="chevron-left" /></button>
        <label><span>{selectedDate === today ? 'BUGÜN' : 'ARŞİV'}</span><strong>{dateLabel(selectedDate)}</strong><input type="date" max={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || today)} aria-label="Günlük tarihi seç" /></label>
        <button disabled={isToday} onClick={() => setSelectedDate(moveDate(selectedDate, 1))} aria-label="Sonraki gün"><AppIcon name="chevron-right" /></button>
      </div>
    </header>

    {notice && <div className="journal-notice" role="status"><AppIcon name="circle-check" /> {notice}</div>}
    {!isToday && <div className="journal-archive-note"><AppIcon name="lock" /><span><strong>Bu sayfa geçmişinin değişmez bir parçası.</strong> Geçmiş günler okunabilir; sessizce değiştirilemez veya silinemez.</span></div>}

    <section className="notebook-shell">
      <div className="notebook-binding" aria-hidden>{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${selectedDate}-${currentPage}`} className="notebook-page" initial={{ opacity: 0, rotateY: currentPage ? -4 : 4, x: currentPage ? 24 : -24 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} exit={{ opacity: 0, rotateY: currentPage ? 4 : -4, x: currentPage ? -18 : 18 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
          <div className="notebook-page-heading"><span>{dateLabel(selectedDate)}</span><em>Sayfa {currentPage + 1}</em></div>
          {visibleSections.includes('wellbeing') && <Wellbeing draft={draft} editable={isToday} onChange={setDraft} />}
          {visibleSections.includes('story') && <NotebookSection icon="pencil" title="Bugün Neler Yaşadın" note="Serbestçe yaz; alan seninle birlikte büyür."><AutoTextarea value={draft.content} readOnly={!isToday} minHeight={230} placeholder="Bugünün sende bıraktığı izleri, hislerini ve düşüncelerini yaz…" onChange={(value) => setDraft((current) => ({ ...current, content: value }))} /></NotebookSection>}
          {visibleSections.includes('moments') && <NotebookSection icon="sparkles" title="Bugünün 3 Anı" note="Hatırlamak istediğin küçük veya büyük anlar."><NumberedList values={draft.moments} editable={isToday} placeholder="Bugünden bir an…" onChange={(index, value) => updateList('moments', index, value)} onAdd={() => setDraft((current) => ({ ...current, moments: [...current.moments, ''] }))} /></NotebookSection>}
          {visibleSections.includes('gratitude') && <NotebookSection icon="heart" title="Bugün Şükrettiklerim" note="Buraya eklediklerin Şükür Alanım ile aynı kaydı kullanır."><NumberedList values={draft.gratitude} editable={isToday} placeholder="Bugün fark ettiğim bir nimet…" onChange={(index, value) => updateList('gratitude', index, value)} /></NotebookSection>}
          {visibleSections.includes('self') && <NotebookSection icon="message-circle" title="Bugün Kendime Not" note="Yarınki sana kısa ve şefkatli bir cümle."><AutoTextarea value={draft.selfNote} readOnly={!isToday} minHeight={130} placeholder="Kendime hatırlatmak istediğim…" onChange={(value) => setDraft((current) => ({ ...current, selfNote: value }))} /></NotebookSection>}
          {visibleSections.includes('activity') && <ActivityTrail items={trail} loading={activitiesLoading} onNavigate={onNavigate} />}
        </motion.div>
      </AnimatePresence>

      <footer className="notebook-footer">
        <button disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><AppIcon name="arrow-left" /> Önceki sayfa</button>
        <div><span>Sayfa {currentPage + 1}/{pages.length}</span><i>{pages.map((_, index) => <b key={index} className={index === currentPage ? 'active' : ''} />)}</i></div>
        <button disabled={currentPage === pages.length - 1} onClick={() => setPage((value) => Math.min(pages.length - 1, value + 1))}>Sonraki sayfa <AppIcon name="arrow-right" /></button>
      </footer>
    </section>

    <nav className="journal-connections" aria-label="Günlüğü diğer alanlarla derinleştir">
      <span><AppIcon name="route" /><strong>Bugünün izini derinleştir</strong><small>Defterin, diğer alanlarınla birlikte anlam kazanır.</small></span>
      <button onClick={() => onNavigate('quran')}><AppIcon name="book-2" /> Kur’an notu</button>
      <button onClick={() => onNavigate('hadis')}><AppIcon name="quote" /> Hadis notu</button>
      <button onClick={() => onNavigate('sukur')}><AppIcon name="sparkles" /> Şükür alanı</button>
    </nav>

    {isToday && <div className="journal-save-bar"><div><AppIcon name="shield-check" /><span><strong>Yazdıkların yalnızca sana görünür.</strong><small>İçerik hiçbir zaman kutuya sığdırılmak için kesilmez.</small></span></div><button className="primary-button" onClick={save}><AppIcon name="device-floppy" /> Bugünün sayfasını kaydet</button></div>}
  </div>
}

function NotebookSection({ icon, title, note, children }: { icon: string; title: string; note: string; children: React.ReactNode }) {
  return <section className="journal-section"><header><span><AppIcon name={icon} /></span><div><h2>{title}</h2><p>{note}</p></div></header>{children}</section>
}

function Wellbeing({ draft, editable, onChange }: { draft: Draft; editable: boolean; onChange: React.Dispatch<React.SetStateAction<Draft>> }) {
  const fields: Array<{ key: 'mood' | 'energy' | 'stress' | 'sleep'; label: string; icon: string; min: number; max: number; suffix: string }> = [
    { key: 'mood', label: 'Ruh hali', icon: 'mood-smile', min: 1, max: 5, suffix: '/5' },
    { key: 'energy', label: 'Enerji', icon: 'bolt', min: 1, max: 10, suffix: '/10' },
    { key: 'stress', label: 'Stres', icon: 'activity', min: 1, max: 10, suffix: '/10' },
    { key: 'sleep', label: 'Uyku', icon: 'moon', min: 0, max: 24, suffix: ' saat' },
  ]
  return <section className="journal-wellbeing"><div><span className="eyebrow">GÜNÜN NABZI</span><h2>Bugün nasıldın?</h2></div><div>{fields.map((field) => <label key={field.key}><span><AppIcon name={field.icon} /> {field.label}</span><strong>{draft[field.key]}{field.suffix}</strong><input disabled={!editable} type="range" min={field.min} max={field.max} value={draft[field.key]} onChange={(event) => onChange((current) => ({ ...current, [field.key]: Number(event.target.value) }))} /></label>)}</div></section>
}

function AutoTextarea({ value, onChange, placeholder, readOnly, minHeight }: { value: string; onChange: (value: string) => void; placeholder: string; readOnly: boolean; minHeight: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`
  }, [minHeight, value])
  return <textarea ref={ref} className="journal-textarea" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} style={{ minHeight }} />
}

function NumberedList({ values, editable, placeholder, onChange, onAdd }: { values: string[]; editable: boolean; placeholder: string; onChange: (index: number, value: string) => void; onAdd?: () => void }) {
  const visible = values.length ? values : ['', '', '']
  return <div className="journal-numbered-list">{visible.map((value, index) => <label key={index}><span>{index + 1}</span><AutoTextarea value={value} onChange={(next) => onChange(index, next)} placeholder={placeholder} readOnly={!editable} minHeight={48} /></label>)}{editable && onAdd && <button type="button" onClick={onAdd}><AppIcon name="plus" /> Bir an daha ekle</button>}</div>
}

function ActivityTrail({ items, loading, onNavigate }: { items: IntegratedActivity[]; loading: boolean; onNavigate: (view: string) => void }) {
  return <section className="journal-section activity-trail"><header><span><AppIcon name="timeline" /></span><div><h2>Bugün Neler Yaptın</h2><p>Uygulamadaki anlamlı adımların otomatik ve salt okunur gün izi.</p></div></header>{loading ? <div className="journal-trail-loading"><i /><i /><i /></div> : items.length === 0 ? <div className="journal-trail-empty"><AppIcon name="leaf" /><span><strong>Bu güne ait başka bir hareket yok.</strong><small>Kur’an, odak, dua veya ders kayıtların burada kendiliğinden görünecek.</small></span></div> : <ol>{items.map((item) => <li key={`${item.category}-${item.id}`}><button onClick={() => onNavigate(item.sourceView)}><span className={`trail-icon ${item.category}`}><AppIcon name={trailIcon(item.category)} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><time dateTime={item.occurredAt}>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.occurredAt))}</time><AppIcon name="chevron-right" /></button></li>)}</ol>}</section>
}

function trailIcon(category: IntegratedActivity['category']) {
  return ({ quran: 'book-2', hadis: 'quote', matrix: 'circle-check', lessons: 'history', sukur: 'sparkles', mescidim: 'building-mosque', focus: 'target-arrow', profession: 'certificate', awareness: 'world-heart', journal: 'notebook' } as const)[category]
}
