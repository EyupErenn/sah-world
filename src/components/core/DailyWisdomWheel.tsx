'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

  const wheelLabels = useMemo(() => list.map((item) => item.theme), [list])

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
    setNotice(`${mode === 'verse' ? 'Ayet' : 'Hadis'} alanına kaydedildi · +10 XP`)
  }

  return (
    <div className="view-stack wisdom-view">
      <header className="page-heading wisdom-heading">
        <div><span className="eyebrow">GÜNLÜK TEFEKKÜR</span><h1>Bugünün Çarkı</h1><p>Bir ayet veya hadis hatırlatması seç; sakinlikle düşün ve istersen kişisel alanına kaydet.</p></div>
        {notice && <span className="success-toast" role="status"><AppIcon name="check" /> {notice}</span>}
      </header>

      <section className="surface-card wisdom-card" aria-labelledby="wisdom-title">
        <div className="wisdom-tabs" role="tablist" aria-label="Çark türü">
          {(Object.keys(modeMeta) as ReflectionKind[]).map((key) => <button id={`wisdom-${key}-tab`} key={key} role="tab" aria-controls="wisdom-panel" aria-selected={mode === key} className={mode === key ? 'active' : ''} onClick={() => changeMode(key)}><AppIcon name={modeMeta[key].icon} /> {modeMeta[key].label}</button>)}
        </div>

        <div id="wisdom-panel" className="wisdom-layout" role="tabpanel" aria-labelledby={`wisdom-${mode}-tab`}>
          <div className="wheel-stage">
            <div className="wheel-pointer" aria-hidden><AppIcon name="triangle-filled" /></div>
            <div className={`wisdom-wheel ${isSpinning ? 'spinning' : ''}`} style={{ transform: `rotate(${rotation}deg)` }} aria-hidden>
              <div className="wheel-orbit" />
              {wheelLabels.map((label, index) => <span key={`${label}-${index}`} style={{ transform: `rotate(${index * (360 / list.length)}deg) translateY(-116px) rotate(${-index * (360 / list.length) - rotation}deg)` }}>{label}</span>)}
              <div className="wheel-center"><AppIcon name={modeMeta[mode].icon} /><small>{mode === 'verse' ? 'AYET' : 'HADİS'}</small></div>
            </div>
            <button className="spin-button" type="button" onClick={spin} disabled={isSpinning} aria-busy={isSpinning}><AppIcon name="refresh" /> {isSpinning ? 'Çark dönüyor…' : `${modeMeta[mode].label}nı çevir`}</button>
            <p>Her çeviriş yeni bir tefekkür önerisi sunar. Kaydetmek zorunlu değildir.</p>
          </div>

          <article className="wisdom-result" aria-live="polite" aria-busy={isSpinning}>
            <div className="wisdom-result-top"><span className="eyebrow">{modeMeta[mode].eyebrow}</span><span className="theme-chip">{selected.theme}</span></div>
            <div className="wisdom-symbol" aria-hidden><AppIcon name={modeMeta[mode].icon} /></div>
            <h2 id="wisdom-title">{isSpinning ? 'Yeni bir hatırlatma seçiliyor…' : selected.title}</h2>
            <blockquote>{isSpinning ? 'Bir an dur, nefesine dön ve çarkın sakinleşmesini bekle.' : `“${selected.text}”`}</blockquote>
            <strong className="wisdom-reference">{selected.reference}</strong>
            <div className="wisdom-actions">
              <button className="primary-button" type="button" onClick={save} disabled={isSpinning || alreadySaved}><AppIcon name={alreadySaved ? 'circle-check' : 'bookmark'} /> {alreadySaved ? modeMeta[mode].saved : modeMeta[mode].save}</button>
              <a className="ghost-button" href={selected.sourceUrl} target="_blank" rel="noreferrer"><AppIcon name="external-link" /> Kaynağı aç</a>
            </div>
            <p className="wisdom-source-note"><AppIcon name="info-circle" /> Kısa anlam, tefekkür için hazırlanmıştır. Tam metin ve bağlam için resmî kaynağı incele.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
