'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { HADITH_REFLECTIONS, VERSE_REFLECTIONS, getDailyReflectionIndex, type ReflectionKind } from '@/lib/dailyReflections'
import { supabase } from '@/lib/supabase'
import { recordXpEvent } from '@/lib/xp'
import { useAuthStore } from '@/store/useAuthStore'
import { useJourneyStore } from '@/store/useJourneyStore'

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

export default function DailyWisdomWheel({ entry }: { entry?: WisdomEntry }) {
  const store = useJourneyStore()
  const user = useAuthStore((state) => state.user || state.session?.user)
  const identity = user?.id || 'guest'
  const [tab, setTab] = useState<WisdomTab>(entry?.tab || 'verse')
  const [mode, setMode] = useState<ReflectionKind>(entry?.tab === 'hadith' ? 'hadith' : 'verse')
  const [archiveKind, setArchiveKind] = useState<'all' | ReflectionKind>(entry?.archiveKind || 'all')
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [selectedIndex, setSelectedIndex] = useState(() => getDailyReflectionIndex('verse', VERSE_REFLECTIONS.length, identity))
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pastEmpty, setPastEmpty] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveBurst, setSaveBurst] = useState(false)
  const [composerKind, setComposerKind] = useState<ReflectionKind | null>(null)
  const spinTimer = useRef<number | null>(null)
  const revealTimer = useRef<number | null>(null)
  const loadedHistoryKey = useRef('')
  const recentIdsRef = useRef<string[]>([])

  const list = mode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
  const selected = selectedIndex >= 0 ? list[selectedIndex % list.length] : null
  const isToday = selectedDate === todayKey()
  const formattedDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: selectedDate === todayKey() ? undefined : 'numeric' }).format(dateFromKey(selectedDate))
  const themeColor = selected ? (themePalette[selected.theme] || '#4f46e5') : '#4f46e5'
  const marker = selected ? `[wheel:${selected.id}]` : ''
  const availableCount = list.filter((item) => !new Set([...recentIds.slice(0, RECENT_LIMIT), selected?.id || '']).has(item.id)).length
  const alreadySaved = Boolean(selected && (mode === 'verse'
    ? store.quranNotes.some((note) => note.date === selectedDate && (note.ders.includes(marker) || (note.ayet === selected.reference && note.tefsir.includes(selected.text))))
    : store.hadisNotes.some((note) => note.date === selectedDate && (note.uygulama.includes(marker) || (note.kaynak === selected.reference && note.metin.includes(selected.text))))))

  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    if (revealTimer.current) window.clearTimeout(revealTimer.current)
  }, [])

  useEffect(() => {
    if (tab === 'archive') return
    const loadKey = `${identity}:${mode}:${selectedDate}`
    if (loadedHistoryKey.current === loadKey) return
    loadedHistoryKey.current = loadKey
    let active = true
    const currentList = mode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
    const fallbackIndex = getDailyReflectionIndex(mode, currentList.length, identity, dateFromKey(selectedDate))
    setHistoryLoading(true)
    setPastEmpty(false)
    setSelectedIndex(fallbackIndex)

    const load = async () => {
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
    setTab(next)
    setNotice('')
    if (next !== 'archive') {
      setMode(next)
      setSelectedDate(todayKey())
      setRotation(0)
    }
  }

  const spin = () => {
    if (isSpinning || !isToday || historyLoading) return
    // Read the persisted queue at click time as well as React state. This keeps
    // rapid/background-tab spins correct even when a render is temporarily delayed.
    const persistedRecent = readLocalHistory(identity).filter((item) => item.content_type === mode).map((item) => item.content_id)
    const recentQueue = Array.from(new Set([...persistedRecent, ...recentIdsRef.current])).slice(0, RECENT_LIMIT)
    const excluded = new Set([...recentQueue, selected?.id || ''])
    let eligible = list.map((item, index) => ({ item, index })).filter(({ item }) => !excluded.has(item.id))
    if (!eligible.length) eligible = list.map((item, index) => ({ item, index })).filter(({ item }) => item.id !== selected?.id)
    const target = eligible[secureRandomIndex(eligible.length)]
    if (!target) return

    setIsSpinning(true)
    setIsRevealing(false)
    setNotice('')
    const targetAngle = target.index * (360 / list.length)
    setRotation((current) => current + 1080 + 360 - (targetAngle % 360))
    spinTimer.current = window.setTimeout(() => {
      setSelectedIndex(target.index)
      setIsSpinning(false)
      setIsRevealing(true)
      recentIdsRef.current = [target.item.id, ...recentIdsRef.current.filter((id) => id !== target.item.id)].slice(0, RECENT_LIMIT)
      setRecentIds(recentIdsRef.current)
      void recordReveal(mode, target.item.id, false, identity, user?.id)
      revealTimer.current = window.setTimeout(() => setIsRevealing(false), 420)
    }, 1320)
  }

  const save = () => {
    if (!selected || alreadySaved || !isToday) return
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
            <button onClick={() => setSelectedDate((date) => addDays(date, -1))} aria-label="Önceki gün"><AppIcon name="chevron-left" /></button>
            <span className="wisdom-date"><AppIcon name="calendar" /> {formattedDate}</span>
            <button onClick={() => setSelectedDate((date) => addDays(date, 1))} disabled={isToday} aria-label="Sonraki gün"><AppIcon name="chevron-right" /></button>
          </div>}
        </header>

        {tab === 'archive'
          ? <ArchiveView items={archiveItems} filter={archiveKind} setFilter={setArchiveKind} composerKind={composerKind} setComposerKind={setComposerKind} onSubmit={submitManual} onDelete={(kind, id) => kind === 'verse' ? store.deleteQuranNote(id) : store.deleteHadisNote(id)} />
          : <div id="wisdom-panel" className="wisdom-layout" role="tabpanel" aria-labelledby={`wisdom-${mode}-tab`}>
            <div className="wheel-stage">
              <div className="wheel-stage-copy"><span>TEFEKKÜR PUSULASI</span><h2>{mode === 'verse' ? 'Bir ayetle dur ve düşün' : 'Bir hadisle yönünü tazele'}</h2><p>{isToday ? `Her seçim ${list.length} doğrulanmış kaynaktan gelir; son ${RECENT_LIMIT} sonuç tekrar edilmez.` : 'Geçmiş günler salt okunurdur; o gün gerçekten açılan sonuç gösterilir.'}</p></div>

              <div className={`premium-dial ${isSpinning ? 'spinning' : ''}`} aria-label={`${list.length} içerikli etkileşimli tefekkür çarkı`}>
                <div className="dial-pointer" />
                <svg className="wisdom-dial" viewBox="0 0 320 320" style={{ transform: `rotate(${rotation}deg)` }}>
                  <defs><linearGradient id={`dialStroke-${mode}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a5b4fc"/><stop offset=".52" stopColor={themeColor}/><stop offset="1" stopColor="#f0abfc"/></linearGradient><radialGradient id={`dialGlow-${mode}`}><stop offset="0" stopColor={themeColor} stopOpacity=".24"/><stop offset="1" stopColor="#312e81" stopOpacity="0"/></radialGradient></defs>
                  <circle cx="160" cy="160" r="151" fill={`url(#dialGlow-${mode})`} stroke="rgba(255,255,255,.08)" />
                  <circle cx="160" cy="160" r="128" fill="none" stroke={`url(#dialStroke-${mode})`} strokeWidth="2" strokeDasharray="3 7" />
                  <circle cx="160" cy="160" r="103" fill="none" stroke="rgba(255,255,255,.09)" />
                  {Array.from({ length: 20 }, (_, index) => { const angle = (index * 18 - 90) * Math.PI / 180; return <circle key={index} cx={160 + Math.cos(angle) * 128} cy={160 + Math.sin(angle) * 128} r={index % 5 === 0 ? 5 : 3} fill={index % 5 === 0 ? '#fff' : 'rgba(255,255,255,.48)'} /> })}
                </svg>
                <div className="dial-core">
                  <span><AppIcon name={modeMeta[mode].icon} /></span><strong>{isSpinning ? 'Seçiliyor' : selected?.theme || 'Geçmiş'}</strong><small>{list.length} KAYNAK · SON {RECENT_LIMIT} KORUMALI</small>
                </div>
              </div>

              <button className="spin-button" type="button" onClick={spin} disabled={isSpinning || !isToday || historyLoading} aria-busy={isSpinning} aria-label={isToday ? `Yeni bir ${mode === 'verse' ? 'ayet' : 'hadis'} seç · ${availableCount} yakın zamanda gösterilmemiş seçenek` : 'Geçmiş gün · salt okunur'}><AppIcon name="refresh" /> {isSpinning ? 'Çark dönüyor…' : isToday ? `Yeni bir ${mode === 'verse' ? 'ayet' : 'hadis'} seç` : 'Geçmiş gün · salt okunur'}</button>
              <p className="wheel-privacy"><AppIcon name={isToday ? 'shield-check' : 'history'} /> {isToday ? 'İlk seçim gün boyunca sabittir; yalnızca sen yeniden çevirdiğinde değişir.' : 'Bu görünüm geçmişteki gerçek kaydı gösterir ve yeni seçim üretmez.'}</p>
            </div>

            <article className="wisdom-result" aria-live="polite" aria-busy={isSpinning || historyLoading} style={{ '--theme-color': themeColor } as CSSProperties}>
              {historyLoading ? <ResultSkeleton /> : pastEmpty || !selected ? <PastEmpty date={formattedDate} /> : <AnimatePresence mode="wait">
                <motion.div className="wisdom-reveal" key={selected.id} initial={{ opacity: 0, x: 18, filter: 'blur(5px)' }} animate={{ opacity: isSpinning ? .22 : 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -10 }} transition={{ duration: isRevealing ? .42 : .22, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="wisdom-result-top"><span className="eyebrow">{modeMeta[mode].eyebrow}</span><span className="theme-chip"><i /> {selected.theme}</span></div>
                  <span className="wisdom-quote-mark" aria-hidden>“</span>
                  <h2 id="wisdom-title">{selected.title}</h2>
                  <blockquote>{selected.text}</blockquote>
                  <div className="wisdom-citation"><span><AppIcon name="shield-check" /></span><div><small>DOĞRULANABİLİR KAYNAK</small><strong>{selected.reference}</strong><em>{selected.sourceLabel}</em></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${selected.reference} kaynağını yeni sekmede aç`}><AppIcon name="external-link" /></a></div>
                  <div className="wisdom-reflection"><span><AppIcon name="bulb" /></span><div><small>BUGÜN İÇİN</small><p>Bu hatırlatmanın davranışlarında nasıl küçük, somut bir karşılığı olabilir?</p></div></div>
                  {isToday && <div className="wisdom-actions">
                    <motion.button className="primary-button wisdom-save" type="button" onClick={save} disabled={isSpinning || alreadySaved} animate={saveBurst ? { scale: [1, 1.045, 1] } : { scale: 1 }}><AppIcon name={alreadySaved ? 'circle-check' : 'bookmark'} /> {alreadySaved ? modeMeta[mode].saved : modeMeta[mode].save}{saveBurst && <span className="save-sparkles" aria-hidden><i/><i/><i/></span>}</motion.button>
                    <button className="ghost-button" type="button" onClick={spin} disabled={isSpinning}><AppIcon name="arrows-shuffle" /> Başka bir seçim</button>
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
