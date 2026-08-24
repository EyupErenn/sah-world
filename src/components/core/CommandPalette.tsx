'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { buildSearchIndex } from '@/lib/activity'
import { useJourneyStore } from '@/store/useJourneyStore'

const destinations = [
  ['dashboard', 'Evrenim', 'home-2'], ['focus', 'Odaklanma Zamanlayıcısı', 'target-arrow'], ['daily-wheel', 'Bugünün Çarkı', 'refresh'], ['journal', 'Günlük', 'notebook'],
  ['quran', 'Kur’an', 'book-2'], ['hadis', 'Hadis', 'quote'], ['sukur', 'Şükür', 'sparkles'],
  ['lessons', 'Hatalar ve Dersler', 'history'], ['matrix', 'Öncelik Matrisi', 'layout-grid'],
  ['mescidim', 'Mescidim', 'building-mosque'], ['reports', 'Raporlarım', 'chart-histogram'], ['community', 'Topluluk', 'users-group'],
  ['awareness', 'Mazlum Coğrafyalar', 'world-heart'],
] as const

export default function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (view: string) => void }) {
  const store = useJourneyStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const index = useMemo(() => buildSearchIndex(store), [store])
  const normalized = query.trim().toLocaleLowerCase('tr-TR')
  const records = normalized ? index.filter((item) => item.searchable.includes(normalized)).slice(0, 8) : []
  const sections = destinations.filter(([, label]) => !normalized || label.toLocaleLowerCase('tr-TR').includes(normalized))
  const visibleSections = sections.slice(0, normalized ? 5 : 6)
  const resultCount = visibleSections.length + records.length

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => { setQuery(''); setActiveIndex(0); inputRef.current?.focus() }, 60)
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', close)
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', close) }
  }, [open, onClose])

  const go = (view: string) => { onNavigate(view); onClose() }
  const selectActive = () => {
    if (activeIndex < visibleSections.length) go(visibleSections[activeIndex][0])
    else if (records[activeIndex - visibleSections.length]) go(records[activeIndex - visibleSections.length].view)
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!resultCount) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((value) => (value + 1) % resultCount) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((value) => (value - 1 + resultCount) % resultCount) }
    if (event.key === 'Enter') { event.preventDefault(); selectActive() }
  }

  return <AnimatePresence>{open && <motion.div className="command-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.section className="command-dialog" role="dialog" aria-modal="true" aria-label="Her yerde ara" initial={{ opacity: 0, y: -14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .985 }} transition={{ duration: .18 }}>
      <div className="command-input"><AppIcon name="search" /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }} onKeyDown={handleKeyDown} placeholder="Notlarda, görevlerde ve bölümlerde ara…" aria-label="Arama" aria-activedescendant={resultCount ? `command-result-${activeIndex}` : undefined} /><kbd>ESC</kbd></div>
      <div className="command-results">
        {visibleSections.length > 0 && <section><p>BÖLÜMLER</p>{visibleSections.map(([id, label, icon], itemIndex) => <button id={`command-result-${itemIndex}`} className={activeIndex === itemIndex ? 'active' : ''} key={id} onMouseEnter={() => setActiveIndex(itemIndex)} onClick={() => go(id)}><span><AppIcon name={icon} /></span><strong>{label}</strong><small>Bölüme git</small><AppIcon name="arrow-right" /></button>)}</section>}
        {records.length > 0 && <section><p>KAYITLARIN</p>{records.map((item, recordIndex) => { const itemIndex = visibleSections.length + recordIndex; return <button id={`command-result-${itemIndex}`} className={activeIndex === itemIndex ? 'active' : ''} key={`${item.category}-${item.id}`} onMouseEnter={() => setActiveIndex(itemIndex)} onClick={() => go(item.view)}><span style={{ color: item.color, background: `${item.color}12` }}><AppIcon name={item.icon} /></span><strong>{item.title}</strong><small>{item.preview}</small><AppIcon name="arrow-right" /></button> })}</section>}
        {normalized && !records.length && !sections.length && <div className="command-empty"><AppIcon name="search" /><strong>“{query}” için sonuç bulamadık</strong><p>Başka bir kelime deneyebilir veya yeni bir kayıt oluşturabilirsin.</p></div>}
      </div>
      <footer><span><kbd>↑</kbd><kbd>↓</kbd> gezin</span><span><kbd>↵</kbd> aç</span><span>Kayıtların yalnızca sana görünür</span></footer>
    </motion.section>
  </motion.div>}</AnimatePresence>
}
