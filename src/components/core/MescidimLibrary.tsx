'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { ASMA_NAMES, ASMA_SOURCE, DUA_LIBRARY, getDailyAsma, type AsmaName, type DuaCategory, type DuaItem } from '@/lib/spiritualLibrary'
import { supabase } from '@/lib/supabase'
import { isValidUUID, useJourneyStore } from '@/store/useJourneyStore'
import { useAuthStore } from '@/store/useAuthStore'

type LibraryTab = 'asma' | 'dua'
type LogResult = { journal_entry_id: string; journal_content: string; xp_awarded: number; daily_xp_count: number }

const LOCAL_FAVORITES_KEY = 'sah-spiritual-favorites-v1'
const DAILY_LIMIT = 3

export default function MescidimLibrary({ initialTab = 'asma', onTabChange }: { initialTab?: LibraryTab; onTabChange?: (tab: LibraryTab) => void }) {
  const [tab, setTab] = useState<LibraryTab>(initialTab)
  const dailyName = getDailyAsma()
  const selectTab = (next: LibraryTab) => { setTab(next); onTabChange?.(next) }

  return <div className="spiritual-library">
    <section className="spiritual-daily-hero">
      <div className="spiritual-orbit" aria-hidden="true"><i/><i/><i/><span>{dailyName.arabic}</span></div>
      <div><span className="eyebrow">GÜNÜN İSMİ · {dailyName.order}/99</span><h2>{dailyName.transliteration}</h2><p>{dailyName.meaning}</p><blockquote>{dailyName.reflection}</blockquote><button onClick={() => selectTab('asma')} className="spiritual-hero-button">Bugünün ismini tefekkür et <AppIcon name="arrow-right" /></button></div>
      <aside><strong>99</strong><span>isimlik kaynaklı kütüphane</span><small>{ASMA_SOURCE.note}</small></aside>
    </section>

    <nav className="spiritual-tabs" aria-label="Mescidim kütüphanesi">
      <button className={tab === 'asma' ? 'active' : ''} onClick={() => selectTab('asma')}><AppIcon name="sparkles" /> Esmâü’l Hüsnâ <span>99</span></button>
      <button className={tab === 'dua' ? 'active' : ''} onClick={() => selectTab('dua')}><AppIcon name="book-2" /> Dua Kütüphanesi <span>{DUA_LIBRARY.length}</span></button>
    </nav>
    {tab === 'asma' ? <AsmaLibrary dailyName={dailyName} /> : <DuaLibrary />}
  </div>
}

function useSpiritualState() {
  const { user } = useAuthStore()
  const journey = useJourneyStore()
  const [favoriteAsma, setFavoriteAsma] = useState<number[]>([])
  const [favoriteDuas, setFavoriteDuas] = useState<string[]>([])
  const [reflections, setReflections] = useState<Record<number, string>>({})
  const [loggedToday, setLoggedToday] = useState<string[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let cached: { asma?: number[]; duas?: string[]; reflections?: Record<number, string>; logged?: string[]; loggedDate?: string } = {}
      try { cached = JSON.parse(window.localStorage.getItem(LOCAL_FAVORITES_KEY) || '{}') } catch {}
      setFavoriteAsma(cached.asma || [])
      setFavoriteDuas(cached.duas || [])
      setReflections(cached.reflections || {})
      setLoggedToday(cached.loggedDate === new Date().toLocaleDateString('en-CA') ? cached.logged || [] : [])

      if (!user || !isValidUUID(user.id)) return
      void Promise.all([
        supabase.from('user_asma_reflections').select('asma_order_number,is_favorite,reflection_note').eq('user_id', user.id),
        supabase.from('user_dua_favorites').select('dua_id').eq('user_id', user.id),
        supabase.from('journal_spiritual_links').select('entry_kind,reference_id').eq('user_id', user.id).eq('entry_date', new Date().toLocaleDateString('en-CA')),
      ]).then(([asmaResult, duaResult, logResult]) => {
        if (!asmaResult.error) {
          const rows = asmaResult.data || []
          setFavoriteAsma(rows.filter((row) => row.is_favorite).map((row) => row.asma_order_number))
          setReflections(Object.fromEntries(rows.filter((row) => row.reflection_note).map((row) => [row.asma_order_number, row.reflection_note || ''])))
        }
        if (!duaResult.error) setFavoriteDuas((duaResult.data || []).map((row) => row.dua_id))
        if (!logResult.error) setLoggedToday((logResult.data || []).map((row) => `${row.entry_kind}:${row.reference_id}`))
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user])

  const saveLocal = (next?: { asma?: number[]; duas?: string[]; reflections?: Record<number, string>; logged?: string[] }) => {
    const payload = { asma: next?.asma ?? favoriteAsma, duas: next?.duas ?? favoriteDuas, reflections: next?.reflections ?? reflections, logged: next?.logged ?? loggedToday, loggedDate: new Date().toLocaleDateString('en-CA') }
    window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(payload))
  }

  const toggleAsma = async (order: number) => {
    const next = favoriteAsma.includes(order) ? favoriteAsma.filter((item) => item !== order) : [...favoriteAsma, order]
    setFavoriteAsma(next); saveLocal({ asma: next })
    if (user && isValidUUID(user.id)) await supabase.from('user_asma_reflections').upsert({ user_id: user.id, asma_order_number: order, is_favorite: next.includes(order), reflection_note: reflections[order] || '' }, { onConflict: 'user_id,asma_order_number' })
  }

  const saveReflection = async (order: number, value: string) => {
    const next = { ...reflections, [order]: value }
    setReflections(next); saveLocal({ reflections: next }); setNotice('Tefekkür notun kaydedildi.')
    if (user && isValidUUID(user.id)) await supabase.from('user_asma_reflections').upsert({ user_id: user.id, asma_order_number: order, is_favorite: favoriteAsma.includes(order), reflection_note: value }, { onConflict: 'user_id,asma_order_number' })
  }

  const toggleDua = async (id: string) => {
    const exists = favoriteDuas.includes(id)
    const next = exists ? favoriteDuas.filter((item) => item !== id) : [...favoriteDuas, id]
    setFavoriteDuas(next); saveLocal({ duas: next })
    if (user && isValidUUID(user.id)) {
      if (exists) await supabase.from('user_dua_favorites').delete().eq('user_id', user.id).eq('dua_id', id)
      else await supabase.from('user_dua_favorites').insert({ user_id: user.id, dua_id: id })
    }
  }

  const logToJournal = async (kind: 'asma' | 'dua', referenceId: string, reflection: string, label: string) => {
    const key = `${kind}:${referenceId}`
    if (loggedToday.includes(key)) { setNotice('Bu tefekkür bugün günlüğünde zaten yer alıyor.'); return }
    let result: LogResult
    if (user && isValidUUID(user.id)) {
      const { data, error } = await supabase.rpc('log_spiritual_to_journal', { target_kind: kind, target_reference_id: referenceId, reflection_text: reflection || null })
      if (error || !data?.[0]) { setNotice('Günlüğe eklenemedi. Lütfen tekrar dene.'); return }
      result = data[0]
    } else {
      const today = new Date().toLocaleDateString('en-CA')
      const current = journey.journal.find((entry) => entry.date === today)
      const xpCount = loggedToday.length
      const line = `🕌 ${label}${reflection ? ` — ${reflection}` : ''}`
      result = { journal_entry_id: current?.id || crypto.randomUUID(), journal_content: [current?.content, line].filter(Boolean).join('\n\n'), xp_awarded: xpCount < DAILY_LIMIT ? 10 : 0, daily_xp_count: Math.min(DAILY_LIMIT, xpCount + 1) }
    }
    const today = new Date().toLocaleDateString('en-CA')
    const current = journey.journal.find((entry) => entry.id === result.journal_entry_id || entry.date === today)
    journey.upsertJournalLocal({
      id: result.journal_entry_id, date: today,
      mood: current?.mood ?? 3, energy: current?.energy ?? 7, stress: current?.stress ?? 3, sleep: current?.sleep,
      content: result.journal_content, moments: current?.moments ?? [], selfNote: current?.selfNote ?? '',
      tags: [...new Set([...(current?.tags ?? []), 'mescidim'])], createdAt: current?.createdAt ?? new Date().toISOString(),
    })
    window.dispatchEvent(new Event('sah:activity-changed'))
    if (result.xp_awarded) journey.addXP(result.xp_awarded)
    const next = [...loggedToday, key]
    setLoggedToday(next); saveLocal({ logged: next })
    setNotice(result.xp_awarded ? `Günlüğüne eklendi · +${result.xp_awarded} XH` : 'Günlüğüne eklendi · günlük XH sınırına ulaştın')
  }

  return { favoriteAsma, favoriteDuas, reflections, loggedToday, notice, setNotice, toggleAsma, saveReflection, toggleDua, logToJournal }
}

function AsmaLibrary({ dailyName }: { dailyName: AsmaName }) {
  const state = useSpiritualState()
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selected, setSelected] = useState<AsmaName | null>(null)
  const normalized = search.toLocaleLowerCase('tr-TR')
  const names = ASMA_NAMES.filter((name) => (!favoritesOnly || state.favoriteAsma.includes(name.order)) && (!normalized || `${name.transliteration} ${name.meaning}`.toLocaleLowerCase('tr-TR').includes(normalized)))

  return <section className="spiritual-panel">
    <header className="spiritual-panel-header"><div><span className="eyebrow">TEFEKKÜR KÜTÜPHANESİ</span><h2>Allah’ın güzel isimleri</h2><p>Bir ismi aç, anlamını oku ve günlük hayatındaki karşılığını düşün.</p></div><a href={ASMA_SOURCE.url} target="_blank" rel="noreferrer">Kaynak notu <AppIcon name="external-link" /></a></header>
    <div className="spiritual-toolbar"><label><AppIcon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İsim veya anlam ara…" aria-label="Esmâ ara" /></label><button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly((value) => !value)}><AppIcon name="heart" /> Favorilerim</button></div>
    {state.notice && <div className="spiritual-notice" role="status"><AppIcon name="check" /> {state.notice}</div>}
    <div className="asma-grid">{names.map((name) => <article key={name.order} className={`asma-card ${name.order === dailyName.order ? 'daily' : ''}`}><button type="button" className="asma-card-main" onClick={() => setSelected(name)}><span>{name.order}</span><strong lang="ar" dir="rtl">{name.arabic}</strong><h3>{name.transliteration}</h3><p>{name.meaning}</p>{name.order === dailyName.order && <em>Günün ismi</em>}</button><button type="button" aria-label={`${name.transliteration} favori`} className={`asma-card-favorite ${state.favoriteAsma.includes(name.order) ? 'active' : ''}`} onClick={() => void state.toggleAsma(name.order)}><AppIcon name="heart" /></button></article>)}</div>
    {names.length === 0 && <EmptyState label="Aramana uyan bir isim bulunamadı." />}
    {selected && <AsmaDrawer name={selected} reflection={state.reflections[selected.order] || ''} favorite={state.favoriteAsma.includes(selected.order)} logged={state.loggedToday.includes(`asma:${selected.order}`)} onClose={() => setSelected(null)} onFavorite={() => void state.toggleAsma(selected.order)} onSave={(value) => void state.saveReflection(selected.order, value)} onLog={(value) => void state.logToJournal('asma', String(selected.order), value, `${selected.transliteration} tefekkürü`)} />}
  </section>
}

function AsmaDrawer({ name, reflection, favorite, logged, onClose, onFavorite, onSave, onLog }: { name: AsmaName; reflection: string; favorite: boolean; logged: boolean; onClose: () => void; onFavorite: () => void; onSave: (value: string) => void; onLog: (value: string) => void }) {
  const [value, setValue] = useState(reflection)
  return <div className="spiritual-drawer-backdrop" onMouseDown={onClose}><aside className="spiritual-drawer" role="dialog" aria-modal="true" aria-label={name.transliteration} onMouseDown={(event) => event.stopPropagation()}><header><span>{name.order}/99</span><div><button aria-label="Favoriye ekle" className={favorite ? 'active' : ''} onClick={onFavorite}><AppIcon name="heart" /></button><button aria-label="Kapat" onClick={onClose}><AppIcon name="x" /></button></div></header><div className="asma-detail-mark" lang="ar" dir="rtl">{name.arabic}</div><span className="eyebrow">ESMÂÜ’L HÜSNÂ</span><h2>{name.transliteration}</h2><h3>{name.meaning}</h3><p>{name.reflection}</p><div className="source-assurance"><AppIcon name="shield-check"/><span><strong>Kaynak yaklaşımı</strong>{ASMA_SOURCE.note}</span></div><label><span>Kendi tefekkür notun</span><textarea rows={5} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Bu ismin bugün sende uyandırdığı düşünce…"/></label><div className="spiritual-drawer-actions"><button onClick={() => onSave(value)} className="ghost-button">Notu kaydet</button><button onClick={() => onLog(value)} disabled={logged} className="primary-button"><AppIcon name="notebook" /> {logged ? 'Bugün günlüğünde' : 'Günlüğe ekle'}</button></div></aside></div>
}

function DuaLibrary() {
  const state = useSpiritualState()
  const [category, setCategory] = useState<'Tümü' | DuaCategory>('Tümü')
  const [occasion, setOccasion] = useState('Tümü')
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [amin, setAmin] = useState<string[]>([])
  const categories: Array<'Tümü' | DuaCategory> = ['Tümü', 'Kuran’dan Dualar', 'Hadislerden Dualar', 'Sahabeye Öğretilen Dualar']
  const occasions = ['Tümü', ...Array.from(new Set(DUA_LIBRARY.map((item) => item.occasion)))]
  const normalized = query.toLocaleLowerCase('tr-TR')
  const duas = useMemo(() => DUA_LIBRARY.filter((dua) => (category === 'Tümü' || dua.category === category) && (occasion === 'Tümü' || dua.occasion === occasion) && (!favoritesOnly || state.favoriteDuas.includes(dua.id)) && (!normalized || `${dua.title} ${dua.meaning} ${dua.source}`.toLocaleLowerCase('tr-TR').includes(normalized))), [category, occasion, favoritesOnly, normalized, state.favoriteDuas])

  return <section className="spiritual-panel">
    <header className="spiritual-panel-header"><div><span className="eyebrow">KAYNAĞIYLA BİRLİKTE</span><h2>Dua Kütüphanesi</h2><p>Kur’an âyetleri ve açık hadis künyeleriyle düzenlenmiş, aranabilir bir başvuru alanı.</p></div><span className="quiet-chip">{DUA_LIBRARY.length} dua</span></header>
    <div className="spiritual-toolbar"><label><AppIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dua, konu veya kaynak ara…" aria-label="Dua ara" /></label><button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly((value) => !value)}><AppIcon name="heart" /> Favorilerim</button></div>
    <div className="dua-filter-row" aria-label="Dua kaynağı">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="dua-filter-row occasions" aria-label="Dua konusu">{occasions.map((item) => <button key={item} className={occasion === item ? 'active' : ''} onClick={() => setOccasion(item)}>{item}</button>)}</div>
    {state.notice && <div className="spiritual-notice" role="status"><AppIcon name="check" /> {state.notice}</div>}
    <div className="dua-library-list">{duas.map((dua) => <DuaCard key={dua.id} dua={dua} favorite={state.favoriteDuas.includes(dua.id)} logged={state.loggedToday.includes(`dua:${dua.id}`)} amin={amin.includes(dua.id)} onFavorite={() => void state.toggleDua(dua.id)} onAmin={() => setAmin((current) => current.includes(dua.id) ? current.filter((id) => id !== dua.id) : [...current, dua.id])} onLog={() => void state.logToJournal('dua', dua.id, '', `${dua.title}${dua.title.toLocaleLowerCase('tr-TR').endsWith('duası') ? '' : ' duası'} okundu`)} />)}</div>
    {duas.length === 0 && <EmptyState label="Bu filtrelerde bir dua bulunamadı." />}
    <p className="spiritual-cap-note"><AppIcon name="info-circle" /> Günlüğe eklenen ilk {DAILY_LIMIT} farklı manevî kayıt günde 10’ar XH kazandırır. Sonrakiler günlüğe eklenir ancak XH vermez.</p>
  </section>
}

function DuaCard({ dua, favorite, logged, amin, onFavorite, onAmin, onLog }: { dua: DuaItem; favorite: boolean; logged: boolean; amin: boolean; onFavorite: () => void; onAmin: () => void; onLog: () => void }) {
  return <article className="dua-library-card"><header><div><span>{dua.category}</span><em>{dua.occasion}</em></div><button className={favorite ? 'active' : ''} onClick={onFavorite} aria-label={`${dua.title} favori`}><AppIcon name="heart" /></button></header><h3>{dua.title}</h3><blockquote lang="ar" dir="rtl">{dua.arabic}</blockquote><p>{dua.meaning}</p><aside><AppIcon name="bulb"/><span>{dua.context}</span></aside><footer><a href={dua.sourceUrl} target="_blank" rel="noreferrer"><AppIcon name="external-link" /> {dua.source}</a><div><button className={amin ? 'active' : ''} onClick={onAmin}><AppIcon name="sparkles" /> {amin ? 'Âmin denildi' : 'Âmin'}</button><button onClick={onLog} disabled={logged}><AppIcon name="notebook" /> {logged ? 'Günlükte' : 'Günlüğe ekle'}</button></div></footer></article>
}

function EmptyState({ label }: { label: string }) { return <div className="empty-state spiritual-empty"><i><AppIcon name="search"/></i><strong>{label}</strong><p>Arama kelimeni veya seçili filtreleri değiştirebilirsin.</p></div> }
