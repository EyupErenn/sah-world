'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { HADITH_REFLECTIONS, VERSE_REFLECTIONS, getDailyReflectionIndex, type ReflectionKind } from '@/lib/dailyReflections'
import { supabase } from '@/lib/supabase'
import { recordXpEvent } from '@/lib/xp'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'
import { useSearchParams } from 'next/navigation'
import { openAppView, selectedValue } from '@/lib/appLocation'

export type WisdomTab = ReflectionKind | 'archive'
export type WisdomEntry = { tab: WisdomTab; archiveKind?: ReflectionKind; nonce: number }

const modeMeta = {
  verse: { label: 'Ayet Çarkı', eyebrow: 'GÜNÜN AYETİ', icon: 'book-2', save: 'Kur’an notlarıma kaydet', saved: 'Kur’an notlarına kaydedildi' },
  hadith: { label: 'Hadis Çarkı', eyebrow: 'GÜNÜN HADİSİ', icon: 'quote', save: 'Hadis notlarıma kaydet', saved: 'Hadis notlarına kaydedildi' },
} as const

const themePalette: Record<string, string> = {
  Teselli: '#7c3aed', Sabır: '#2563eb', Şükür: '#d97706', Umut: '#059669', Rahmet: '#db2777',
  İhsan: '#4f46e5', Adalet: '#0f766e', Güven: '#0284c7', Gayret: '#ea580c', Kardeşlik: '#7c3aed',
  Tevekkül: '#0891b2', Huzur: '#0d9488', İyilik: '#16a34a', Niyet: '#9333ea', Edep: '#64748b',
}

const RECENT_LIMIT = 20
const todayKey = () => new Date().toLocaleDateString('en-CA')
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const addDays = (key: string, amount: number) => {
  const next = dateFromKey(key)
  next.setDate(next.getDate() + amount)
  return next.toLocaleDateString('en-CA')
}
const isUuid = (value?: string) => Boolean(value && /^[0-9a-f-]{36}$/i.test(value))

type LocalHistory = { content_id: string; content_type: ReflectionKind; reveal_date: string; is_daily: boolean; shown_at: string }

function localHistoryKey(userId: string) { return `sah-wheel-history-${userId}` }
function readLocalHistory(userId: string): LocalHistory[] {
  try { return JSON.parse(window.localStorage.getItem(localHistoryKey(userId)) || '[]') as LocalHistory[] } catch { return [] }
}
function writeLocalHistory(userId: string, item: LocalHistory) {
  const next = [item, ...readLocalHistory(userId)].slice(0, 240)
  window.localStorage.setItem(localHistoryKey(userId), JSON.stringify(next))
}
function secureRandomIndex(length: number) {
  if (length <= 1) return 0
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % length
}

type RevealStep = 0 | 1 | 2 | 3
type RitualField = { label: string; value: string }

const SPIN_SEGMENTS = 12
const SPIN_DURATION_MS = 1720

function pointOnCircle(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 160 + radius * Math.cos(radians), y: 160 + radius * Math.sin(radians) }
}

function segmentPath(index: number) {
  const step = 360 / SPIN_SEGMENTS
  const start = pointOnCircle(145, index * step)
  const end = pointOnCircle(145, (index + 1) * step)
  const innerEnd = pointOnCircle(76, (index + 1) * step)
  const innerStart = pointOnCircle(76, index * step)
  return `M ${start.x} ${start.y} A 145 145 0 0 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A 76 76 0 0 0 ${innerStart.x} ${innerStart.y} Z`
}

function ritualFields(kind: ReflectionKind, item: (typeof VERSE_REFLECTIONS)[number] | null): RitualField[] {
  if (!item) return kind === 'verse'
    ? [{ label: 'Sure', value: '—' }, { label: 'Sayfa', value: '—' }, { label: 'Ayet', value: '—' }]
    : [{ label: 'Kaynak', value: '—' }, { label: 'Konu', value: '—' }, { label: 'Hadis No', value: '—' }]

  if (kind === 'verse') {
    const match = item.reference.match(/^(.+?)\s+(\d+):([\d-]+)$/)
    return [
      { label: 'Sure', value: match?.[1] || item.reference },
      { label: 'Sayfa', value: item.page ? String(item.page) : '—' },
      { label: 'Ayet', value: match?.[3] || item.reference },
    ]
  }

  const hadithNumber = item.id.match(/(\d+)$/)?.[1] || item.reference
  return [
    { label: 'Kaynak', value: 'Nevevî 40 Hadis' },
    { label: 'Konu', value: item.theme },
    { label: 'Hadis No', value: hadithNumber },
  ]
}

function nextSpinLabel(kind: ReflectionKind, step: RevealStep) {
  const labels = kind === 'verse'
    ? ['Sure Çarkını Çevir', 'Sayfa Çarkını Çevir', 'Ayet Çarkını Çevir']
    : ['Kaynak Çarkını Çevir', 'Konu Çarkını Çevir', 'Hadis Çarkını Çevir']
  return labels[Math.min(step, 2)]
}

export default function DailyWisdomWheel({ entry }: { entry?: WisdomEntry }) {
  const store = useJourneyStore()
  const user = useAuthStore((state) => state.session?.access_token === 'mock-token' ? undefined : state.user || state.session?.user)
  const identity = user?.id || 'guest'
  const params = useSearchParams()
  const tab = selectedValue(params.get('wisdom'), ['verse','hadith','archive'] as const, entry?.tab || 'verse')
  const mode:ReflectionKind = tab === 'hadith' ? 'hadith' : 'verse'
  const archiveKind = selectedValue(params.get('archive'), ['all','verse','hadith'] as const, entry?.archiveKind || 'all')
  const setArchiveKind = (next:'all'|ReflectionKind) => openAppView('quran-companion','wheel',{wisdom:'archive',archive:next})
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [selectedIndex, setSelectedIndex] = useState(() => getDailyReflectionIndex('verse', VERSE_REFLECTIONS.length, identity))
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [rotation, setRotation] = useState(0)
  const [revealStep, setRevealStep] = useState<RevealStep>(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pastEmpty, setPastEmpty] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveBurst, setSaveBurst] = useState(false)
  const [composerKind, setComposerKind] = useState<ReflectionKind | null>(null)
  const spinTimer = useRef<number | null>(null)
  const revealTimer = useRef<number | null>(null)
  const recentIdsRef = useRef<string[]>([])

  const list = mode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
  const selected = selectedIndex >= 0 ? list[selectedIndex % list.length] : null
  const isToday = selectedDate === todayKey()
  const formattedDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: selectedDate === todayKey() ? undefined : 'numeric' }).format(dateFromKey(selectedDate))
  const themeColor = selected ? (themePalette[selected.theme] || '#4f46e5') : '#4f46e5'
  const marker = selected ? `[wheel:${selected.id}]` : ''
  const availableCount = list.filter((item) => !new Set([...recentIds.slice(0, RECENT_LIMIT), selected?.id || '']).has(item.id)).length
  const fields = ritualFields(mode, selected)
  const resultRevealed = !isToday || revealStep === 3
  const alreadySaved = Boolean(selected && (mode === 'verse'
    ? store.quranNotes.some((note) => note.date === selectedDate && (note.ders.includes(marker) || (note.ayet === selected.reference && note.tefsir.includes(selected.text))))
    : store.hadisNotes.some((note) => note.date === selectedDate && (note.uygulama.includes(marker) || (note.kaynak === selected.reference && note.metin.includes(selected.text))))))

  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    if (revealTimer.current) window.clearTimeout(revealTimer.current)
  }, [])

  useEffect(() => {
    if (tab === 'archive') return
    let active = true
    const currentList = mode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
    const fallbackIndex = getDailyReflectionIndex(mode, currentList.length, identity, dateFromKey(selectedDate))

    const load = async () => {
      setHistoryLoading(true)
      setPastEmpty(false)
      setSelectedIndex(fallbackIndex)
      const local = readLocalHistory(identity).filter((item) => item.content_type === mode)
      let recent = local.slice(0, RECENT_LIMIT).map((item) => item.content_id)
      let dailyId = local.find((item) => item.reveal_date === selectedDate && item.is_daily)?.content_id

      if (isUuid(user?.id)) {
        const { data, error } = await supabase.from('wheel_history')
          .select('content_id,reveal_date,is_daily,shown_at')
          .eq('content_type', mode)
          .order('shown_at', { ascending: false })
          .limit(80)
        if (!error && data) {
          recent = data.slice(0, RECENT_LIMIT).map((item) => item.content_id)
          dailyId = data.find((item) => item.reveal_date === selectedDate && item.is_daily)?.content_id
        }
      }

      if (!active) return
      recentIdsRef.current = recent
      setRecentIds(recent)
      if (!isToday) {
        const latestStore = useJourneyStore.getState()
        const noteMatch = mode === 'verse'
          ? latestStore.quranNotes.find((note) => note.date === selectedDate && currentList.some((item) => note.ayet === item.reference))
          : latestStore.hadisNotes.find((note) => note.date === selectedDate && currentList.some((item) => note.kaynak === item.reference))
        const resolved = dailyId || (mode === 'verse'
          ? currentList.find((item) => item.reference === (noteMatch && 'ayet' in noteMatch ? noteMatch.ayet : ''))?.id
          : currentList.find((item) => item.reference === (noteMatch && 'kaynak' in noteMatch ? noteMatch.kaynak : ''))?.id)
        const index = currentList.findIndex((item) => item.id === resolved)
        setSelectedIndex(index)
        setPastEmpty(index < 0)
        setHistoryLoading(false)
        return
      }

      if (dailyId) {
        const index = currentList.findIndex((item) => item.id === dailyId)
        if (index >= 0) setSelectedIndex(index)
      } else {
        const candidate = currentList[fallbackIndex]
        const recorded = await recordReveal(mode, candidate.id, true, identity, user?.id)
        const index = currentList.findIndex((item) => item.id === recorded)
        if (active && index >= 0) {
          recentIdsRef.current = [recorded, ...recentIdsRef.current.filter((id) => id !== recorded)].slice(0, RECENT_LIMIT)
          setRecentIds(recentIdsRef.current)
          setSelectedIndex(index)
        }
      }
      if (active) setHistoryLoading(false)
    }
    void load()
    return () => { active = false }
  }, [identity, isToday, mode, selectedDate, tab, user?.id])

  const changeTab = (next: WisdomTab) => {
    if (isSpinning) return
    openAppView('quran-companion','wheel',{wisdom:next})
    setNotice('')
    if (next !== 'archive') {
      setSelectedDate(todayKey())
      setRotation(0)
      setRevealStep(0)
    }
  }

  const changeDate = (amount: number) => {
    if (isSpinning) return
    setSelectedDate((date) => addDays(date, amount))
    setRevealStep(0)
    setIsRevealing(false)
  }

  const spin = () => {
    if (isSpinning || !isToday || historyLoading || revealStep >= 3 || !selected) return
    const nextStep = (revealStep + 1) as RevealStep
    setIsSpinning(true)
    setIsRevealing(false)
    setNotice('')
    const metadataSeed = `${selected.id}:${nextStep}`.split('').reduce((total, character) => total + character.charCodeAt(0), 0)
    const landingSegment = metadataSeed % SPIN_SEGMENTS
    const landingAngle = ((SPIN_SEGMENTS - landingSegment) % SPIN_SEGMENTS) * (360 / SPIN_SEGMENTS)
    setRotation((current) => Math.ceil(current / 360) * 360 + 1440 + landingAngle)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    spinTimer.current = window.setTimeout(() => {
      setRevealStep(nextStep)
      setIsSpinning(false)
      if (nextStep === 3) {
        setIsRevealing(true)
        recentIdsRef.current = [selected.id, ...recentIdsRef.current.filter((id) => id !== selected.id)].slice(0, RECENT_LIMIT)
        setRecentIds(recentIdsRef.current)
        void recordReveal(mode, selected.id, false, identity, user?.id)
        revealTimer.current = window.setTimeout(() => setIsRevealing(false), 520)
      }
    }, reducedMotion ? 80 : SPIN_DURATION_MS)
  }

  const startOver = () => {
    if (isSpinning || !isToday || historyLoading) return
    const persistedRecent = readLocalHistory(identity).filter((item) => item.content_type === mode).map((item) => item.content_id)
    const recentQueue = Array.from(new Set([...persistedRecent, ...recentIdsRef.current])).slice(0, RECENT_LIMIT)
    const excluded = new Set([...recentQueue, selected?.id || ''])
    let eligible = list.map((item, index) => ({ item, index })).filter(({ item }) => !excluded.has(item.id))
    if (!eligible.length) eligible = list.map((item, index) => ({ item, index })).filter(({ item }) => item.id !== selected?.id)
    const target = eligible[secureRandomIndex(eligible.length)]
    if (!target) return
    // The coherent target is selected before the first theatrical spin. The three
    // spins only uncover its metadata; they never perform independent selections.
    setSelectedIndex(target.index)
    setRevealStep(0)
    setIsRevealing(false)
    setNotice('Yeni seçim hazır. Üç adımda keşfet.')
  }

  const showDirectly = () => {
    if (!selected || historyLoading || isSpinning || !isToday) return
    setRevealStep(3)
    recentIdsRef.current = [selected.id, ...recentIdsRef.current.filter(id => id !== selected.id)].slice(0, RECENT_LIMIT)
    setRecentIds(recentIdsRef.current)
    void recordReveal(mode, selected.id, false, identity, user?.id)
    // No separate reward: both reveal paths share the same existing save/action.
  }

  const save = () => {
    if (!selected || alreadySaved || !isToday || !resultRevealed) return
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    if (mode === 'verse') {
      store.addQuranNote({ id, date: selectedDate, sure: selected.reference.split(' ')[0], ayet: selected.reference, tefsir: `${selected.text}\nKaynak: ${selected.sourceLabel}\n${selected.sourceUrl}`, ders: `${marker} Günün ayet çarkından kaydedildi. Bugün bu hatırlatmanın küçük bir karşılığını ara.`, createdAt })
    } else {
      store.addHadisNote({ id, date: selectedDate, metin: selected.text, kaynak: selected.reference, konu: selected.theme, uygulama: `${marker} Günün hadis çarkından kaydedildi. Bugün bu hatırlatmanın küçük bir karşılığını ara.`, createdAt })
    }
    store.addXP(10)
    store.checkBadges()
    void recordXpEvent({ sourceType: mode === 'verse' ? 'quran' : 'hadis', sourceId: id, label: mode === 'verse' ? 'Günün ayeti' : 'Günün hadisi', amount: 10 })
    setNotice(`${mode === 'verse' ? 'Ayet' : 'Hadis'} notlarına kaydedildi · +10 XH`)
    setSaveBurst(true)
    window.setTimeout(() => setSaveBurst(false), 900)
  }

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!composerKind) return
    const form = new FormData(event.currentTarget)
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const date = todayKey()
    if (composerKind === 'verse') {
      store.addQuranNote({ id, date, sure: String(form.get('sure')), ayet: String(form.get('reference')), tefsir: String(form.get('text')), ders: String(form.get('reflection')), createdAt })
      store.addXP(35)
      void recordXpEvent({ sourceType: 'quran', sourceId: id, label: 'Kur’an notu', amount: 35 })
    } else {
      store.addHadisNote({ id, date, kaynak: String(form.get('reference')), konu: String(form.get('theme')), metin: String(form.get('text')), uygulama: String(form.get('reflection')), createdAt })
      store.addXP(30)
      void recordXpEvent({ sourceType: 'hadis', sourceId: id, label: 'Hadis notu', amount: 30 })
    }
    store.checkBadges()
    setComposerKind(null)
    setArchiveKind(composerKind)
    setNotice('Kişisel notun güvenle kaydedildi.')
  }

  const archiveItems = useMemo(() => {
    const quran = store.quranNotes.map((note) => ({ id: note.id, kind: 'verse' as const, date: note.date, title: note.ayet || note.sure, body: note.tefsir, reflection: note.ders, createdAt: note.createdAt }))
    const hadis = store.hadisNotes.map((note) => ({ id: note.id, kind: 'hadith' as const, date: note.date, title: note.kaynak || note.konu, body: note.metin, reflection: note.uygulama, createdAt: note.createdAt }))
    return [...quran, ...hadis].filter((item) => archiveKind === 'all' || item.kind === archiveKind).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [archiveKind, store.hadisNotes, store.quranNotes])

  return (
    <div className="view-stack wisdom-view">
      <header className="page-heading wisdom-heading">
        <div><span className="eyebrow">GÜNLÜK TEFEKKÜR</span><h1>Bugünün Çarkı</h1><p>Günün hatırlatmasını keşfet, üzerinde düşün ve biriktirdiğin manevi notlara tek yerden ulaş.</p></div>
        <AnimatePresence>{notice && <motion.span className="success-toast" role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><AppIcon name="check" /> {notice}</motion.span>}</AnimatePresence>
      </header>

      <section className={`surface-card wisdom-card wisdom-card--${mode}`}>
        <header className="wisdom-toolbar">
          <div className="wisdom-tabs" role="tablist" aria-label="Bugünün Çarkı bölümleri">
            {(['verse', 'hadith'] as ReflectionKind[]).map((key) => <button id={`wisdom-${key}-tab`} key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => changeTab(key)}><AppIcon name={modeMeta[key].icon} /> {modeMeta[key].label}</button>)}
            <button id="wisdom-archive-tab" role="tab" aria-selected={tab === 'archive'} className={tab === 'archive' ? 'active' : ''} onClick={() => changeTab('archive')}><AppIcon name="archive" /> Kayıtlı Notlarım</button>
          </div>
          {tab !== 'archive' && <div className="wisdom-date-nav" aria-label="Tarih seçimi">
            <button onClick={() => changeDate(-1)} aria-label="Önceki gün"><AppIcon name="chevron-left" /></button>
            <span className="wisdom-date"><AppIcon name="calendar" /> {formattedDate}</span>
            <button onClick={() => changeDate(1)} disabled={isToday} aria-label="Sonraki gün"><AppIcon name="chevron-right" /></button>
          </div>}
        </header>

        {tab === 'archive'
          ? <ArchiveView items={archiveItems} filter={archiveKind} setFilter={setArchiveKind} composerKind={composerKind} setComposerKind={setComposerKind} onSubmit={submitManual} onDelete={(kind, id) => kind === 'verse' ? store.deleteQuranNote(id) : store.deleteHadisNote(id)} />
          : <div id="wisdom-panel" className="wisdom-layout" role="tabpanel" aria-labelledby={`wisdom-${mode}-tab`}>
            <div className="wheel-stage">
              <div className="wheel-stage-copy"><span>ÇARK-I RAHMET</span><h2>{mode === 'verse' ? 'Bir ayeti üç adımda keşfet' : 'Bir hadisi üç adımda keşfet'}</h2><p>{isToday ? `Tutarlı tek seçim önceden hazırlanır; üç dönüş yalnızca kaynağını adım adım açar.` : 'Geçmiş günler salt okunurdur; o gün gerçekten açılan sonuç gösterilir.'}</p></div>

              {isToday && <div className="ritual-info" aria-label={`Üç aşamalı keşif · ${revealStep}/3 tamamlandı`}>
                {fields.map((field, index) => <div key={field.label} className={revealStep > index ? 'revealed' : ''}>
                  <span>{field.label}</span><strong>{revealStep > index ? field.value : '—'}</strong>
                </div>)}
              </div>}

              <div className={`premium-dial ${isSpinning ? 'spinning' : ''}`} aria-label={`${list.length} içerikli etkileşimli tefekkür çarkı`}>
                <div className="dial-pointer" />
                <svg className="dial-bezel" viewBox="0 0 320 320" aria-hidden>
                  <circle cx="160" cy="160" r="153" />
                  <circle cx="160" cy="160" r="147" />
                </svg>
                <svg className="wisdom-dial" viewBox="0 0 320 320" style={{ transform: `rotate(${rotation}deg)` }}>
                  <defs>
                    <radialGradient id={`dialGlow-${mode}`}><stop offset="0" stopColor={themeColor} stopOpacity=".3"/><stop offset="1" stopColor="#171a3a" stopOpacity=".16"/></radialGradient>
                    <filter id={`dialLight-${mode}`}><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={mode === 'hadith' ? '#34d399' : '#c4b5fd'} floodOpacity=".32" /></filter>
                  </defs>
                  <circle cx="160" cy="160" r="146" fill={`url(#dialGlow-${mode})`} />
                  {Array.from({ length: SPIN_SEGMENTS }, (_, index) => {
                    const motif = pointOnCircle(111, index * (360 / SPIN_SEGMENTS) + 15)
                    return <g key={index}>
                      <path d={segmentPath(index)} className={`dial-segment ${mode === 'hadith' ? 'hadith' : 'verse'} ${index % 2 ? 'alternate' : ''}`} />
                      <rect x={motif.x - 5} y={motif.y - 5} width="10" height="10" rx="2" transform={`rotate(45 ${motif.x} ${motif.y})`} className="dial-motif" filter={`url(#dialLight-${mode})`} />
                      <circle cx={motif.x} cy={motif.y} r="2.2" className="dial-motif-core" />
                    </g>
                  })}
                  <circle cx="160" cy="160" r="75" className="dial-inner-ring" />
                </svg>
                <div className="dial-core">
                  <span><AppIcon name={modeMeta[mode].icon} /></span><strong>{isSpinning ? 'Dönüyor…' : revealStep === 3 ? 'Tamamlandı' : revealStep ? `${revealStep}/3 açıldı` : 'Hazır'}</strong><small>{mode === 'verse' ? 'AYET' : 'HADİS'} · {revealStep}/3</small>
                </div>
              </div>

              {isToday && <div className="ritual-progress" aria-hidden>{[1, 2, 3].map((step) => <i key={step} className={revealStep >= step ? 'complete' : isSpinning && revealStep + 1 === step ? 'active' : ''} />)}<span>{revealStep}/3</span></div>}
              <button className="spin-button" type="button" onClick={revealStep === 3 ? startOver : spin} disabled={isSpinning || !isToday || historyLoading} aria-busy={isSpinning} aria-label={isToday ? revealStep === 3 ? `Yeni bir seçim hazırla · ${availableCount} yakın zamanda gösterilmemiş seçenek` : nextSpinLabel(mode, revealStep) : 'Geçmiş gün · salt okunur'}><AppIcon name={revealStep === 3 ? 'restore' : 'refresh'} /> {isSpinning ? 'Çark dönüyor…' : !isToday ? 'Geçmiş gün · salt okunur' : revealStep === 3 ? 'Baştan Başla' : nextSpinLabel(mode, revealStep)}</button>
              {isToday && revealStep < 3 && <button className="text-button" disabled={historyLoading || isSpinning} onClick={showDirectly}>{mode === 'verse' ? 'Bugünün ayetini direkt göster' : 'Bugünün hadisini direkt göster'}</button>}
              <p className="wheel-privacy"><AppIcon name={isToday ? 'shield-check' : 'history'} /> {isToday ? 'Üç adımda keşfet veya doğrudan oku. İki yol da aynı hatırlatmayı açar.' : 'Bu görünüm geçmişteki gerçek kaydı gösterir ve yeni seçim üretmez.'}</p>
            </div>

            <article className="wisdom-result" aria-live="polite" aria-busy={isSpinning || historyLoading} style={{ '--theme-color': themeColor } as CSSProperties}>
              {historyLoading ? <ResultSkeleton /> : pastEmpty || !selected ? <PastEmpty date={formattedDate} /> : !resultRevealed ? <RitualLocked kind={mode} step={revealStep} fields={fields} /> : <AnimatePresence mode="wait">
                <motion.div className="wisdom-reveal" key={selected.id} initial={{ opacity: 0, y: 22, filter: 'blur(5px)' }} animate={{ opacity: isSpinning ? .22 : 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10 }} transition={{ duration: isRevealing ? .52 : .22, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="wisdom-result-top"><span className="eyebrow">{modeMeta[mode].eyebrow}</span><span className="theme-chip"><i /> {selected.theme}</span></div>
                  <span className="wisdom-quote-mark" aria-hidden>“</span>
                  <h2 id="wisdom-title">{selected.title}</h2>
                  <blockquote>{selected.text}</blockquote>
                  <div className="wisdom-citation"><span><AppIcon name="shield-check" /></span><div><small>DOĞRULANABİLİR KAYNAK</small><strong>{selected.reference}</strong><em>{selected.sourceLabel}</em></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${selected.reference} kaynağını yeni sekmede aç`}><AppIcon name="external-link" /></a></div>
                  <div className="wisdom-reflection"><span><AppIcon name="bulb" /></span><div><small>BUGÜN İÇİN</small><p>Bu hatırlatmanın davranışlarında nasıl küçük, somut bir karşılığı olabilir?</p></div></div>
                  {isToday && <div className="wisdom-actions">
                    <motion.button className="primary-button wisdom-save" type="button" onClick={save} disabled={isSpinning || alreadySaved || !resultRevealed} animate={saveBurst ? { scale: [1, 1.045, 1] } : { scale: 1 }}><AppIcon name={alreadySaved ? 'circle-check' : 'bookmark'} /> {alreadySaved ? modeMeta[mode].saved : modeMeta[mode].save}{saveBurst && <span className="save-sparkles" aria-hidden><i/><i/><i/></span>}</motion.button>
                    <button className="ghost-button" type="button" onClick={startOver} disabled={isSpinning}><AppIcon name="restore" /> Baştan Başla</button>
                  </div>}
                  <p className="wisdom-source-note"><AppIcon name="info-circle" /> Kısa anlam tefekkür başlangıcıdır. Tam metin, bağlam ve rivayet bilgisi için doğrulanabilir kaynak bağlantısını incele.</p>
                </motion.div>
              </AnimatePresence>}
            </article>
          </div>}
      </section>
    </div>
  )
}

async function recordReveal(kind: ReflectionKind, contentId: string, isDaily: boolean, identity: string, userId?: string) {
  const now = new Date().toISOString()
  const item: LocalHistory = { content_id: contentId, content_type: kind, reveal_date: todayKey(), is_daily: isDaily, shown_at: now }
  if (!isUuid(userId)) {
    const existing = readLocalHistory(identity).find((entry) => isDaily && entry.content_type === kind && entry.reveal_date === item.reveal_date && entry.is_daily)
    if (existing) return existing.content_id
    writeLocalHistory(identity, item)
    return contentId
  }
  const { data, error } = await supabase.rpc('record_wheel_reveal', { requested_type: kind, requested_content_id: contentId, daily_reveal: isDaily })
  if (error) {
    console.warn('[SAH Wheel] Çark geçmişi kaydedilemedi', { code: error.code })
    writeLocalHistory(identity, item)
    return contentId
  }
  const resolved = data?.[0]?.content_id || contentId
  writeLocalHistory(identity, { ...item, content_id: resolved })
  return resolved
}

function RitualLocked({ kind, step, fields }: { kind: ReflectionKind; step: RevealStep; fields: RitualField[] }) {
  const nextField = fields[Math.min(step, 2)]
  return <motion.div className="ritual-locked" key={`${kind}-${step}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <span className="ritual-locked-icon"><AppIcon name={step ? 'sparkles' : 'lock'} /></span>
    <span className="eyebrow">{step ? `${step}. ADIM TAMAM` : 'ÜÇ ADIMLI KEŞİF'}</span>
    <h2>{step ? `${fields[step - 1].label} açıldı` : 'Hatırlatman hazır'}</h2>
    <p>{step < 3 ? `Şimdi “${nextField.label}” bilgisini açmak için çarkı çevir.` : 'Metin açılıyor…'}</p>
    <div className="ritual-locked-fields">
      {fields.map((field, index) => <div key={field.label} className={step > index ? 'revealed' : ''}><span>{field.label}</span><strong>{step > index ? field.value : 'Gizli'}</strong></div>)}
    </div>
    <small><AppIcon name="shield-check" /> Seçim üç dönüş boyunca değişmez.</small>
  </motion.div>
}

function ResultSkeleton() {
  return <div className="wisdom-result-skeleton" aria-label="Günün seçimi yükleniyor"><i/><i/><i/><i/></div>
}

function PastEmpty({ date }: { date: string }) {
  return <div className="wisdom-past-empty"><span><AppIcon name="calendar-off" /></span><h2>{date} için çark kaydı yok</h2><p>Geçmiş günler yeniden üretilmez. O gün bir seçim açılmış veya kaydedilmişse burada görünür.</p></div>
}

type ArchiveItem = { id: string; kind: ReflectionKind; date: string; title: string; body: string; reflection: string; createdAt: string }

function ArchiveView({ items, filter, setFilter, composerKind, setComposerKind, onSubmit, onDelete }: {
  items: ArchiveItem[]; filter: 'all' | ReflectionKind; setFilter: (value: 'all' | ReflectionKind) => void
  composerKind: ReflectionKind | null; setComposerKind: (value: ReflectionKind | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onDelete: (kind: ReflectionKind, id: string) => void
}) {
  return <div className="wisdom-archive">
    <header className="wisdom-archive-hero">
      <div><span className="eyebrow">KİŞİSEL MANEVİ ARŞİV</span><h2>Kaydettiklerin tek, sakin bir yerde.</h2><p>Çarktan kaydettiğin veya kendin eklediğin bütün Kur’an ve hadis notları aynı güvenli veri alanlarında tutulur.</p></div>
      <div><button className="primary-button" onClick={() => setComposerKind('verse')}><AppIcon name="book-2" /> Kur’an notu ekle</button><button className="ghost-button" onClick={() => setComposerKind('hadith')}><AppIcon name="quote" /> Hadis notu ekle</button></div>
    </header>
    <div className="wisdom-archive-toolbar">
      <div className="wisdom-filter">{([['all', 'Tümü'], ['verse', 'Kur’an'], ['hadith', 'Hadis']] as const).map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <span><AppIcon name="lock" /> Yalnızca sana görünür · {items.length} kayıt</span>
    </div>
    {composerKind && <form className="wisdom-note-composer" onSubmit={onSubmit}>
      <header><div><span className="eyebrow">{composerKind === 'verse' ? 'YENİ KUR’AN NOTU' : 'YENİ HADİS NOTU'}</span><h3>Düşünceni kayda dönüştür</h3></div><button type="button" onClick={() => setComposerKind(null)} aria-label="Formu kapat"><AppIcon name="x" /></button></header>
      <div className="two-fields">
        {composerKind === 'verse' ? <><label>Sure<input name="sure" required placeholder="Örn. İnşirah" /></label><label>Ayet / referans<input name="reference" required placeholder="Örn. 94:5-6" /></label></> : <><label>Kaynak<input name="reference" required placeholder="Örn. Buhârî, Edeb, 31" /></label><label>Konu<input name="theme" required placeholder="Örn. Sabır" /></label></>}
      </div>
      <label>{composerKind === 'verse' ? 'Tefsir / not' : 'Hadis metni / kısa not'}<textarea name="text" required rows={4} placeholder="Sende kalan anlam…" /></label>
      <label>Hayata taşıyacağım ders<textarea name="reflection" required rows={3} placeholder="Bugün uygulayabileceğim küçük adım…" /></label>
      <footer><button className="ghost-button" type="button" onClick={() => setComposerKind(null)}>Vazgeç</button><button className="primary-button" type="submit"><AppIcon name="bookmark" /> Güvenle kaydet</button></footer>
    </form>}
    {items.length ? <div className="wisdom-note-grid">{items.map((item) => <article key={`${item.kind}-${item.id}`}>
      <header><span className={`note-kind ${item.kind}`}><AppIcon name={modeMeta[item.kind].icon} /> {item.kind === 'verse' ? 'Kur’an notu' : 'Hadis notu'}</span><time dateTime={item.date}>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateFromKey(item.date))}</time></header>
      <h3>{item.title}</h3><p>{item.body}</p>{item.reflection && <blockquote>{item.reflection.replace(/\[wheel:[^\]]+\]\s*/, '')}</blockquote>}
      <footer><span><AppIcon name="shield-check" /> Kişisel kayıt</span><button onClick={() => onDelete(item.kind, item.id)} aria-label="Notu sil"><AppIcon name="trash" /></button></footer>
    </article>)}</div> : <div className="wisdom-archive-empty"><span><AppIcon name="bookmark" /></span><h3>Henüz kayıtlı notun yok</h3><p>Çarktan bir hatırlatmayı kaydet veya ilk kişisel notunu ekle; burada güvenle birikmeye başlasın.</p></div>}
  </div>
}
