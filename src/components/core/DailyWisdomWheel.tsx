'use client'

import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { HADITH_REFLECTIONS, VERSE_REFLECTIONS, getDailyReflectionIndex, type ReflectionKind } from '@/lib/dailyReflections'
import { recordXpEvent } from '@/lib/xp'
import { useJourneyStore } from '@/store/useJourneyStore'

const modeMeta = {
  verse: { label: 'Ayet Çarkı', eyebrow: 'GÜNÜN AYETİ', icon: 'book-2', save: 'Kur’an alanıma kaydet', saved: 'Bugünün ayeti alanında' },
  hadith: { label: 'Hadis Çarkı', eyebrow: 'GÜNÜN HADİSİ', icon: 'quote', save: 'Hadis alanıma kaydet', saved: 'Bugünün hadisi alanında' },
} as const

function localDateKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function DailyWisdomWheel() {
  const store = useJourneyStore()
  const [mode, setMode] = useState<ReflectionKind>('verse')
  const [selectedIndex, setSelectedIndex] = useState(() => getDailyReflectionIndex('verse', VERSE_REFLECTIONS.length))
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [notice, setNotice] = useState('')
  const spinTimer = useRef<number | null>(null)
  const list = mode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
  const selected = list[selectedIndex % list.length]
  const today = localDateKey()
  const dailyMarker = mode === 'verse' ? 'Günün ayet çarkından kaydedildi.' : 'Günün hadis çarkından kaydedildi.'
  const alreadySaved = mode === 'verse'
    ? store.quranNotes.some((note) => note.date === today && note.ders.includes(dailyMarker))
    : store.hadisNotes.some((note) => note.date === today && note.uygulama.includes(dailyMarker))

  const formattedDate = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date())

  useEffect(() => () => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
  }, [])

  const changeMode = (nextMode: ReflectionKind) => {
    if (spinTimer.current) window.clearTimeout(spinTimer.current)
    setMode(nextMode)
    const nextList = nextMode === 'verse' ? VERSE_REFLECTIONS : HADITH_REFLECTIONS
    setSelectedIndex(getDailyReflectionIndex(nextMode, nextList.length))
    setRotation(0)
    setIsSpinning(false)
    setNotice('')
  }

  const spin = () => {
    if (isSpinning) return
    const randomStep = 1 + Math.floor(Math.random() * (list.length - 1))
    const nextIndex = (selectedIndex + randomStep) % list.length
    setIsSpinning(true)
    setNotice('')
    setRotation((current) => current + 720 + randomStep * (360 / list.length))
    spinTimer.current = window.setTimeout(() => {
      setSelectedIndex(nextIndex)
      setIsSpinning(false)
    }, 900)
  }

  const save = () => {
    if (alreadySaved) return
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    if (mode === 'verse') {
      store.addQuranNote({ id, date: today, sure: selected.reference.split(' ')[0], ayet: selected.reference, tefsir: `${selected.text}\nKaynak: ${selected.sourceLabel}`, ders: `${dailyMarker} ${selected.text}`, createdAt })
    } else {
      store.addHadisNote({ id, date: today, metin: selected.text, kaynak: selected.reference, konu: selected.theme, uygulama: `${dailyMarker} ${selected.text}`, createdAt })
    }
    store.addXP(10)
    store.checkBadges()
    void recordXpEvent({ sourceType: mode === 'verse' ? 'quran' : 'hadis', sourceId: id, label: mode === 'verse' ? 'Günün ayeti' : 'Günün hadisi', amount: 10 })
    setNotice(`${mode === 'verse' ? 'Ayet' : 'Hadis'} alanına kaydedildi · +10 XH`)
  }

  return (
    <div className="view-stack wisdom-view">
      <header className="page-heading wisdom-heading">
        <div><span className="eyebrow">GÜNLÜK TEFEKKÜR</span><h1>Bugünün Çarkı</h1><p>Bir ayet veya hadis hatırlatması seç; sakinlikle düşün ve istersen kişisel alanına kaydet.</p></div>
        {notice && <span className="success-toast" role="status"><AppIcon name="check" /> {notice}</span>}
      </header>

      <section className={`surface-card wisdom-card wisdom-card--${mode}`} aria-labelledby="wisdom-title">
        <header className="wisdom-toolbar">
          <div className="wisdom-tabs" role="tablist" aria-label="Çark türü">
            {(Object.keys(modeMeta) as ReflectionKind[]).map((key) => <button id={`wisdom-${key}-tab`} key={key} role="tab" aria-controls="wisdom-panel" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)}><AppIcon name={modeMeta[key].icon} /> {modeMeta[key].label}</button>)}
          </div>
          <span className="wisdom-date"><AppIcon name="calendar" /> {formattedDate}</span>
        </header>

        <div id="wisdom-panel" className="wisdom-layout" role="tabpanel" aria-labelledby={`wisdom-${mode}-tab`}>
          <div className="wheel-stage">
            <div className="wheel-stage-copy"><span>TEFEKKÜR PUSULASI</span><h2>{mode === 'verse' ? 'Bir ayetle dur ve düşün' : 'Bir hadisle yönünü tazele'}</h2><p>Çark sana bir başlangıç sunar; anlamı acele etmeden kendi hayatında karşılık bulsun.</p></div>

            <div className="premium-dial" aria-hidden>
              <div className="dial-pointer" />
              <svg className="wisdom-dial" viewBox="0 0 320 320" style={{ transform: `rotate(${rotation}deg)` }}>
                <defs>
                  <linearGradient id="dialStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a5b4fc"/><stop offset=".52" stopColor="#8b5cf6"/><stop offset="1" stopColor="#f0abfc"/></linearGradient>
                  <radialGradient id="dialGlow"><stop offset="0" stopColor="#818cf8" stopOpacity=".22"/><stop offset="1" stopColor="#312e81" stopOpacity="0"/></radialGradient>
                </defs>
                <circle cx="160" cy="160" r="151" fill="url(#dialGlow)" stroke="rgba(255,255,255,.08)" />
                <circle cx="160" cy="160" r="128" fill="none" stroke="url(#dialStroke)" strokeWidth="1.5" strokeDasharray="2 8" />
                <circle cx="160" cy="160" r="103" fill="none" stroke="rgba(255,255,255,.08)" />
                <path d="M160 31 A129 129 0 0 1 288 160" fill="none" stroke="url(#dialStroke)" strokeWidth="4" strokeLinecap="round" />
                {list.map((item, index) => {
                  const angle = (index * (360 / list.length) - 90) * Math.PI / 180
                  const cx = 160 + Math.cos(angle) * 128
                  const cy = 160 + Math.sin(angle) * 128
                  return <circle key={item.id} cx={cx} cy={cy} r={index === selectedIndex ? 6 : 3.5} fill={index === selectedIndex ? '#f5d0fe' : 'rgba(255,255,255,.45)'} stroke={index === selectedIndex ? '#fff' : 'transparent'} strokeWidth="2" />
                })}
              </svg>
              <div className="dial-core"><span><AppIcon name={modeMeta[mode].icon} /></span><strong>{selected.theme}</strong><small>{String(selectedIndex + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}</small></div>
            </div>

            <button className="spin-button" type="button" onClick={spin} disabled={isSpinning} aria-busy={isSpinning}><AppIcon name="refresh" /> {isSpinning ? 'Yeni seçim hazırlanıyor…' : `Yeni bir ${mode === 'verse' ? 'ayet' : 'hadis'} seç`}</button>
            <p className="wheel-privacy"><AppIcon name="lock" /> Seçimin, sen kaydedene kadar yalnızca bu ekranda kalır.</p>
          </div>

          <article className="wisdom-result" aria-live="polite" aria-busy={isSpinning}>
            <div className="wisdom-result-top"><span className="eyebrow">{modeMeta[mode].eyebrow}</span><span className="theme-chip"><i /> {selected.theme}</span></div>
            <span className="wisdom-quote-mark" aria-hidden>“</span>
            <h2 id="wisdom-title">{isSpinning ? 'Yeni bir hatırlatma seçiliyor…' : selected.title}</h2>
            <blockquote>{isSpinning ? 'Bir an dur, nefesine dön ve seçimin sakinleşmesini bekle.' : selected.text}</blockquote>
            <div className="wisdom-citation"><span><AppIcon name={modeMeta[mode].icon} /></span><div><small>KAYNAK</small><strong>{selected.reference}</strong></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${selected.reference} kaynağını yeni sekmede aç`}><AppIcon name="external-link" /></a></div>
            <div className="wisdom-reflection"><span><AppIcon name="bulb" /></span><div><small>BUGÜN İÇİN</small><p>Bu hatırlatmanın davranışlarında nasıl küçük bir karşılığı olabilir?</p></div></div>
            <div className="wisdom-actions">
              <button className="primary-button" type="button" onClick={save} disabled={isSpinning || alreadySaved}><AppIcon name={alreadySaved ? 'circle-check' : 'bookmark'} /> {alreadySaved ? modeMeta[mode].saved : modeMeta[mode].save}</button>
              <button className="ghost-button" type="button" onClick={spin} disabled={isSpinning}><AppIcon name="arrows-shuffle" /> Başka bir seçim</button>
            </div>
            <p className="wisdom-source-note"><AppIcon name="info-circle" /> Kısa anlam, tefekkür başlangıcıdır. Tam metin ve bağlam için kaynak bağlantısını incele.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
