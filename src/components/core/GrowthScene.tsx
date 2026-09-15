'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { getLevelForXP, LEVELS } from '@/lib/constants'
import { getVitality, type GrowthSceneData } from '@/lib/growthScene'
import { growthInputForCategory, type GrowthInputKey } from '@/lib/growthDiagram'
import type { ActivityEvent } from '@/lib/activity'
import type { GrowthNavigationCue } from './GrowthTree'
import { BotanicalScene } from './growth/BotanicalScene'
import styles from './growth/GrowthScene.module.css'

type Pulse = { source: GrowthInputKey; amount: number; key: string }
type Props = {
  data: GrowthSceneData
  events?: ActivityEvent[]
  loading?: boolean
  now?: number
  onNavigate: (view: string, cue?: GrowthNavigationCue) => void
}
const stageIcons = ['seeding', 'plant', 'plant-2', 'tree', 'trees', 'mountain', 'star', 'sun', 'galaxy', 'universe']
const descriptions = [
  'Başlangıç görünmez olabilir; yine de kök salmaya başladı.',
  'İlk filiz, tekrar etmeye değer küçük bir niyeti temsil ediyor.',
  'Fidanın gövdesi güçleniyor; alışkanlıkların biçim kazanıyor.',
  'Ağaç artık kendi gölgesini kuruyor; ritmin belirginleşiyor.',
  'Tek bir ağaç çevresine hayat çağırıyor; istikrarın yayılıyor.',
  'Dağ silueti beliriyor; uzun soluklu emeğin ufku genişliyor.',
  'Yıldızlar sahneye katılıyor; sürekliliğin yeni işaretler bırakıyor.',
  'Güneş doğuyor; kökle gökyüzü aynı hikâyede buluşuyor.',
  'Galaksi halkaları açılıyor; farklı alanlardaki emeklerin birleşiyor.',
  'Evren tamamlandı; sahnen, uzun yolculuğunun yaşayan bir haritası.',
]
// Ends enter the matching botanical region; coordinates share the orbit's viewBox.
const flows: Record<GrowthInputKey, string> = {
  quran: 'M 194 153 C 244 153 242 218 302 235',
  focus: 'M 686 153 C 613 153 643 360 451 366',
  sukur: 'M 194 341 C 236 341 225 120 530 131',
  lessons: 'M 686 341 C 619 341 647 493 530 488',
  journal: 'M 230 552 C 230 462 222 300 339 275',
  profession: 'M 650 552 C 650 425 568 337 475 321',
  mescidim: 'M 440 96 C 676 96 660 539 440 511',
}

export default function GrowthScene({ data, events = [], loading = false, now, onNavigate }: Props) {
  const root = useRef<HTMLElement>(null)
  const [reduced, setReduced] = useState(true)
  const uid = `garden-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [hovered, setHovered] = useState<GrowthInputKey | null>(null)
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [clock, setClock] = useState<number | null>(null)
  const known = useRef<Set<string> | null>(null)
  const playing = inView && visible && !reduced && !loading
  const vitality = getVitality(data.vitalityScore)
  const levelIndex = Math.max(0, Math.min(9, data.level - 1))
  const level = LEVELS[levelIndex]
  const next = LEVELS[levelIndex + 1]
  const xpLevel = getLevelForXP(data.xh)
  const progress = next ? Math.round(Math.max(0, Math.min(100, (data.xh - level.xp) / (next.xp - level.xp) * 100))) : 100

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReduced(preference.matches)
    updateMotion()
    preference.addEventListener('change', updateMotion)
    const update = () => { setVisible(!document.hidden); setClock(Date.now()) }
    update()
    const timer = window.setInterval(update, 60_000)
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setRevealed(true)
    }, { threshold: 0.01 })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); window.clearInterval(timer); document.removeEventListener('visibilitychange', update); preference.removeEventListener('change', updateMotion) }
  }, [])

  useEffect(() => {
    if (loading) return
    const eligible = events.filter((event) => growthInputForCategory(event.category))
    const keys = new Set(eligible.map((event) => `${event.category}:${event.id}`))
    if (!known.current) { known.current = keys; return }
    const added = eligible.filter((event) => !known.current!.has(`${event.category}:${event.id}`))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
    known.current = keys
    // Refetches, edits, deletions and historical hydration must not celebrate again.
    if (!added || Date.now() - Date.parse(added.createdAt) > 120_000 || !inView || !visible || reduced) return
    const source = growthInputForCategory(added.category)
    if (!source) return
    const start = window.setTimeout(() => setPulse({ source, amount: added.xp, key: `${added.category}:${added.id}` }), 0)
    return () => window.clearTimeout(start)
  }, [events, data.xh, loading, inView, visible, reduced])

  useEffect(() => {
    if (!pulse) return
    const end = window.setTimeout(() => setPulse(null), 1500)
    return () => window.clearTimeout(end)
  }, [pulse])

  const hour = clock === null ? 12 : new Date(clock).getHours()
  const time = hour >= 6 && hour < 10 ? 'dawn' : hour >= 10 && hour < 17 ? 'day' : 'dusk'
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now ?? clock ?? 0)
    date.setDate(date.getDate() - 6 + index)
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  })
  return <section ref={root} className={styles.root} data-growth-scene="botanical-v1" data-playing={playing} data-ready={revealed && !loading} data-vitality={vitality} data-time={time} data-highlight={hovered ?? pulse?.source ?? ''} aria-labelledby={`${uid}-title`} aria-busy={loading}>
    <div className={styles.info}>
      <span className={styles.eyebrow}>YAŞAYAN GELİŞİM ALANIN</span>
      <div className={styles.heading}><h2 id={`${uid}-title`}>{level.name}</h2><span>Seviye {data.level} / 10</span></div>
      <p className={styles.description}>{descriptions[levelIndex]} Son yedi gündeki gerçek hareketlerin; toprağı, ışığı ve kökleri besler.</p>
      <div className={styles.stats}>
        <div><strong><Count value={data.weeklyActions} run={playing} /></strong><span>haftalık hareket</span></div>
        <div><strong><Count value={data.fedAreas} run={playing} />/7</strong><span>beslenen alan</span></div>
      </div>
      <div className={styles.note}><AppIcon name="activity-heartbeat" /><div><strong>Gerçek verilerle büyüyor…</strong><p>Her kayıt, sahnendeki bir yaşam alanını görünür biçimde güçlendirir.</p></div></div>
      <div className={styles.progressCopy}><strong><Count value={data.xh} run={playing} /> XH</strong><span>{next ? `${progress}% · ${next.name} için ${data.xhToNext} XH` : 'Yolculuğun en geniş ufku'}</span></div>
      <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Sonraki seviyeye ilerleme"><span style={{ width: `${progress}%` }} /></div>
      <ol className={styles.journey} aria-label="On seviyelik gelişim yolculuğu">{LEVELS.map((item, index) => <li key={item.name} data-current={index === levelIndex} data-complete={index < levelIndex}><span tabIndex={0} aria-current={index === levelIndex ? 'step' : undefined} aria-label={`${item.name}, ${index + 1}. seviye, ${item.xp} XH`}><StageIcon index={index} /><small role="tooltip">{item.name} · {item.xp} XH</small></span></li>)}</ol>
      <div className={styles.journeyCaption}><span>Tohum</span><span>10 AŞAMALI YOLCULUK</span><span>Evren</span></div>
      <div className={styles.next}><StageIcon index={Math.min(9, levelIndex + 1)} /><div><strong>{next ? 'Sıradaki gelişim sahnesi' : 'Gelişim sahnen tamamlandı'}</strong><p>{next ? `${next.name} · ${data.xhToNext} XH kaldı` : 'Evrenin bütün katmanları görünür'}</p></div></div>
    </div>
    <div className={styles.visual}>
      <header className={styles.period}><span><i />SON 7 GÜN · CANLI ETKİNLİK</span><button type="button" onClick={() => onNavigate('reports')}>Etkinlik akışını aç <AppIcon name="arrow-right" /></button></header>
      <div className={styles.orbit}>
        <div className={styles.art}>
          <BotanicalScene uid={uid} stage={data.stage} fedAreas={data.fedAreas} vitality={vitality} playing={playing} pulse={pulse !== null} label={`${level.name}, seviye ${data.level}/10, son 7 günde ${data.weeklyActions} hareket, ${data.fedAreas} alan besleniyor`} />
          <span className={styles.output}><AppIcon name="arrow-up" /><span><strong>{pulse ? `+${pulse.amount} XH` : 'XH'}</strong><small>Gelişim çıktısı</small></span></span>
          {!loading && !data.weeklyActions && <button className={styles.emptyAction} onClick={() => onNavigate('journal')}><AppIcon name="plus" />İlk hareketini yap</button>}
        </div>
        <svg className={styles.connections} viewBox="0 0 880 624" preserveAspectRatio="none" aria-hidden="true">
          {data.habitats.map((habitat) => <g key={habitat.id} data-flow={habitat.id} data-active={habitat.count7d > 0} className={styles.flow} style={{ '--habitat': `var(--habitat-${habitat.id})` } as CSSProperties}>
            <defs><linearGradient id={`${uid}-flow-${habitat.id}`}><stop stopColor="var(--habitat)" stopOpacity=".3" /><stop offset="1" stopColor="var(--habitat)" /></linearGradient></defs>
            <path d={flows[habitat.id]} stroke={`url(#${uid}-flow-${habitat.id})`} className={styles.flowBase} />
            <path d={flows[habitat.id]} className={styles.flowDash} />
            {habitat.count7d > 0 && <path d={flows[habitat.id]} className={styles.flowLight} pathLength="100" />}
            {pulse?.source === habitat.id && <path key={pulse.key} d={flows[habitat.id]} className={styles.liveFlow} pathLength="100" />}
          </g>)}
        </svg>
        <div className={styles.habitats} aria-label="Gelişimini besleyen alanlar">
          {data.habitats.map((habitat) => <button key={habitat.id} type="button" className={styles.habitat} data-habitat={habitat.id} data-active={habitat.count7d > 0} style={{ '--habitat': `var(--habitat-${habitat.id})`, '--intensity': habitat.intensity } as CSSProperties} onMouseEnter={() => setHovered(habitat.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(habitat.id)} onBlur={() => setHovered(null)} onClick={() => onNavigate(habitat.target, { source: 'growth-diagram', accent: getComputedStyle(root.current!).getPropertyValue(`--habitat-${habitat.id}`).trim(), icon: habitat.icon, label: habitat.name })} aria-label={`${habitat.name} bölümüne git. Son 7 günde ${habitat.count7d} hareket. ${habitat.description}`}>
            <span className={styles.habitatIcon}><AppIcon name={habitat.icon} /></span>
            <span className={styles.habitatCopy}><strong>{habitat.name}</strong><small>{habitat.count7d ? `${habitat.count7d} Hareket · ${habitat.status === 'güçlü' ? 'Güçlü' : 'Filizleniyor'}` : 'Bu Hafta Henüz Kayıt Yok'}</small></span>
            <AppIcon name="arrow-up-right" className={styles.chevron} />
            <span className={styles.week} aria-label={habitat.daily.map((count, day) => `${dates[day]}: ${count} kayıt`).join(', ')}>{habitat.daily.map((count, day) => <i key={day} data-filled={count > 0} data-today={day === 6} title={`${dates[day]}: ${count} kayıt`} />)}</span>
          </button>)}
        </div>
      </div>
      <p className={styles.hint}><AppIcon name="info-circle" />Bir alana dokunarak doğrudan ilerle. Işık ve canlılık, son 7 günün gerçek kayıtlarını gösterir.</p>
    </div>
    <span className={styles.sr} role="status" aria-live="polite">{pulse ? `${pulse.amount} XH. ${xpLevel.level.name} seviyesinde gelişimin güncellendi.` : ''}</span>
  </section>
}

function Count({ value, run }: { value: number; run: boolean }) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(0)
  useEffect(() => {
    if (!run) return
    const from = previous.current
    previous.current = value
    let frame = 0
    const start = performance.now()
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / 650)
      setDisplay(Math.round(from + (value - from) * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, run])
  return <span>{(run ? display : value).toLocaleString('tr-TR')}</span>
}

function StageIcon({ index }: { index: number }) {
  // Small inline illustrations avoid missing glyphs in the legacy icon font.
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-stage-icon={stageIcons[index]}>
    {index === 0 ? <path d="M7 17C3 8 15 4 17 8S18 18 7 17ZM8 16l7-7" /> : index < 3 ? <><path d="M12 21V10M12 15C4 15 3 8 5 7c6 0 7 5 7 8ZM12 10c0-6 4-8 8-7 1 6-4 8-8 7Z" />{index === 2 && <path d="M12 18c5 0 8-3 8-6-5-1-8 2-8 6Z" />}</> : index < 5 ? <><path d="M12 22v-9M8 22h8M12 17l-3-3M12 15l4-3M6 16c-6-2-4-8 0-9 0-7 11-7 12-1 6 2 5 10-1 10Z" />{index === 4 && <path d="M3 22v-4M21 22v-4" />}</> : index === 5 ? <path d="M2 21 10 3l5 10 3-5 5 13ZM7 10l3 2 3-3" /> : index === 6 ? <path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z" /> : index === 7 ? <><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></> : <><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r={index === 8 ? 4 : 7}/>{index === 9 && <ellipse cx="12" cy="12" rx="4" ry="11" transform="rotate(-30 12 12)"/>}</>}
  </svg>
}
