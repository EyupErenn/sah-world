'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import { getLevelForXP, LEVELS } from '@/lib/constants'
import {
  buildGrowthInputs,
  growthInputForCategory,
  type GrowthInput,
  type GrowthInputKey,
} from '@/lib/growthDiagram'
import type { ActivityEvent } from '@/lib/activity'

export type GrowthNavigationCue = {
  source: 'growth-diagram'
  accent: string
  icon: string
  label: string
}

type GrowthTreeProps = {
  xp: number
  trigger: number
  lastAmount: number
  events: ActivityEvent[]
  onNavigate: (view: string, cue?: GrowthNavigationCue) => void
}

type InputStyle = CSSProperties & {
  '--input-accent': string
  '--input-intensity': number
}

type Pulse = { source: GrowthInputKey; nonce: number; amount: number }

export default function GrowthTree({ xp, trigger, lastAmount, events, onNavigate }: GrowthTreeProps) {
  const { level, nextLevel, index } = getLevelForXP(xp)
  const start = level.xp
  const end = nextLevel?.xp ?? start
  const progress = nextLevel ? Math.min(100, ((xp - start) / Math.max(1, end - start)) * 100) : 100
  const uid = useId().replace(/:/g, '')
  const reducedMotion = useReducedMotion()
  const inputs = useMemo(() => buildGrowthInputs(events), [events])
  const latestRelevant = events.find((event) => growthInputForCategory(event.category))
  const latestFingerprint = latestRelevant ? `${latestRelevant.category}:${latestRelevant.id}` : ''
  const previousEvent = useRef(latestFingerprint)
  const previousTrigger = useRef(trigger)
  const pulseTimer = useRef<number | null>(null)
  const [pulse, setPulse] = useState<Pulse | null>(null)

  const activatePulse = (source: GrowthInputKey, amount: number) => {
    if (reducedMotion) return
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
    setPulse({ source, nonce: Date.now(), amount })
    pulseTimer.current = window.setTimeout(() => setPulse(null), 1500)
  }

  useEffect(() => {
    if (!latestFingerprint) return
    if (!previousEvent.current) {
      previousEvent.current = latestFingerprint
      return
    }
    if (previousEvent.current !== latestFingerprint && latestRelevant) {
      const source = growthInputForCategory(latestRelevant.category)
      previousEvent.current = latestFingerprint
      if (source) {
        const timer = window.setTimeout(() => activatePulse(source, latestRelevant.xp), 0)
        return () => window.clearTimeout(timer)
      }
    }
  }, [latestFingerprint, latestRelevant, reducedMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (trigger <= previousTrigger.current) return
    previousTrigger.current = trigger
    const source = latestRelevant ? growthInputForCategory(latestRelevant.category) : null
    if (source) {
      const timer = window.setTimeout(() => activatePulse(source, lastAmount), 0)
      return () => window.clearTimeout(timer)
    }
  }, [lastAmount, latestRelevant, reducedMotion, trigger]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current)
  }, [])

  const mescidimIntensity = inputs.find((input) => input.id === 'mescidim')?.intensity ?? 0.12

  return (
    <section className="growth-card growth-system" aria-labelledby="growth-title">
      <div className="growth-copy">
        <span className="eyebrow">GELİŞİM SAHNEN</span>
        <div className="level-heading"><h2 id="growth-title">{level.name}</h2><span>Seviye {index + 1} / 10</span></div>
        <p>{levelCopy[index]} Son yedi gündeki gerçek hareketlerin, sahneyi besleyen akışlara dönüşür.</p>
        <div className="growth-model-note"><AppIcon name="activity-heartbeat" /><span><strong>Canlı gelişim modeli</strong><small>Akış kalınlığı ve ışık, yakın tarihli katılımına göre değişir.</small></span></div>
        <div className="progress-heading"><strong>{xp.toLocaleString('tr-TR')} XH</strong><span>{nextLevel ? `${Math.round(progress)}% · ${nextLevel.name} için ${nextLevel.xp - xp} XH` : 'Yolculuğun en geniş ufku'}</span></div>
        <div className="core-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Sonraki seviyeye ilerleme"><span style={{ width: `${progress}%` }} /></div>
        <div className="level-rail" aria-label="On seviyelik gelişim yolculuğu">{LEVELS.map((item, itemIndex) => <i key={item.name} className={`${itemIndex < index ? 'is-complete' : ''} ${itemIndex === index ? 'is-current' : ''}`} title={`${itemIndex + 1}. seviye: ${item.name}`} />)}</div>
        <div className="level-rail-caption" aria-hidden="true"><span>Tohum</span><span>10 aşamalı yolculuk</span><span>Evren</span></div>
        <div className="growth-next"><span>{nextLevel?.icon ?? LEVELS[index].icon}</span><p><strong>{nextLevel ? 'Sıradaki gelişim sahnesi' : 'Gelişim sahnen tamamlandı'}</strong><small>{nextLevel ? `${nextLevel.name} · ${nextLevel.xp - xp} XH kaldı` : 'Evrenin bütün katmanları görünür'}</small></p></div>
      </div>

      <div className="growth-illustration" aria-label={`${level.name} seviyesinde, son yedi günün faaliyetleriyle beslenen gelişim diyagramı`}>
        <div className="diagram-period">
          <i aria-hidden="true" />
          <span>SON 7 GÜN</span>
          <button type="button" onClick={() => onNavigate('reports')}>
            Etkinlik akışını aç <AppIcon name="arrow-right" />
          </button>
        </div>
        <div className={`growth-diagram ${pulse ? 'is-responding' : ''}`}>
          <svg className="growth-flow-layer" viewBox="0 0 820 600" aria-hidden="true">
            <defs>
              <filter id={`${uid}-flow-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {inputs.map((input) => <FlowPath key={input.id} input={input} uid={uid} pulse={pulse} />)}
            <circle className="ambient-orbit" cx="410" cy="292" r="164" style={{ opacity: 0.2 + mescidimIntensity * 0.45 }} />
            <circle className="ambient-orbit orbit-two" cx="410" cy="292" r="180" style={{ opacity: 0.14 + mescidimIntensity * 0.3 }} />
          </svg>

          <motion.div
            className="growth-scene-frame"
            key={index}
            initial={reducedMotion ? false : { opacity: 0.28, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <TreeScene index={index} uid={uid} progress={progress} pulse={pulse} mescidimIntensity={mescidimIntensity} />
            <div className="growth-output" aria-label={`Toplam ${xp} deneyim puanı`}>
              <span><AppIcon name="arrow-up" /></span><p><strong>{pulse ? `+${pulse.amount} XH` : 'XH'}</strong><small>Gelişim çıktısı</small></p>
            </div>
          </motion.div>

          {inputs.map((input) => (
            <button
              key={input.id}
              className={`growth-input input-${input.id} status-${input.status}`}
              style={{ '--input-accent': input.accent, '--input-intensity': input.intensity } as InputStyle}
              onClick={() => onNavigate(input.target, { source: 'growth-diagram', accent: input.accent, icon: input.icon, label: input.accessibleLabel })}
              aria-label={`${input.accessibleLabel} bölümüne git. Son 7 günde ${input.count} hareket. ${input.metaphor}`}
            >
              <span className="growth-input-icon"><AppIcon name={input.icon} /></span>
              <span className="growth-input-copy"><strong>{input.label}</strong><small>{input.count ? `${input.count} hareket · ${input.status}` : 'Bu hafta sessiz'}</small></span>
              <span className="growth-input-arrow"><AppIcon name="arrow-up-right" /></span>
              <span className="growth-input-tooltip" role="tooltip">{input.metaphor}</span>
            </button>
          ))}
        </div>
        <p className="diagram-caption"><AppIcon name="info-circle" /> Bir alan seçerek doğrudan ilerleyebilirsin. Yoğunluk, son 7 günün gerçek kayıtlarını gösterir.</p>
      </div>
    </section>
  )
}

function FlowPath({ input, uid, pulse }: { input: GrowthInput; uid: string; pulse: Pulse | null }) {
  const pathId = `${uid}-${input.id}-flow`
  const particles = Math.max(2, Math.round(input.intensity * 4))
  const isPulseSource = pulse?.source === input.id
  return <g className={`diagram-flow flow-${input.id} ${isPulseSource ? 'is-live-pulse' : ''}`} style={{ color: input.accent }}>
    <path id={pathId} d={input.path} className="flow-guide" style={{ opacity: 0.48 + input.intensity * 0.35, strokeWidth: 2.4 + input.intensity * 3.2 }} />
    <path d={input.path} className="flow-dashes" style={{ opacity: 0.62 + input.intensity * 0.28, strokeWidth: 1.5 + input.intensity * 1.6 }} />
    {Array.from({ length: particles }, (_, index) => <circle key={index} className="flow-particle" r={2.4 + input.intensity * 1.8} fill="currentColor" opacity={0.68 + input.intensity * 0.28} filter={`url(#${uid}-flow-glow)`}>
      <animateMotion dur={`${5.4 - input.intensity * 2.2}s`} begin={`${index * -1.2}s`} repeatCount="indefinite"><mpath href={`#${pathId}`} /></animateMotion>
    </circle>)}
    {isPulseSource && <circle key={pulse.nonce} className="event-flow-pulse" r="7" fill="currentColor" filter={`url(#${uid}-flow-glow)`}>
      <animateMotion dur=".9s" fill="freeze"><mpath href={`#${pathId}`} /></animateMotion>
    </circle>}
  </g>
}

function TreeScene({ index, uid, progress, pulse, mescidimIntensity }: { index: number; uid: string; progress: number; pulse: Pulse | null; mescidimIntensity: number }) {
  const motes = Array.from({ length: Math.min(16, 3 + index + Math.round(mescidimIntensity * 5)) }, (_, item) => ({ x: 32 + ((item * 71) % 372), y: 48 + ((item * 43) % 210), delay: item * -0.31 }))
  return <svg viewBox="0 0 440 360" role="img" aria-label={`${LEVELS[index].name} seviyesinde kökleri görünen katmanlı gelişim ağacı`}>
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={index >= 8 ? '#191b49' : index >= 6 ? '#4b4aa1' : '#a9d4ea'}/><stop offset=".55" stopColor={index >= 8 ? '#57428b' : index >= 6 ? '#7766bd' : '#dce8e8'}/><stop offset="1" stopColor={index >= 8 ? '#dfa47d' : '#f1d9a7'}/></linearGradient>
      <linearGradient id={`${uid}-hill-back`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#514d88' : '#7db29f'}/><stop offset="1" stopColor={index >= 7 ? '#635b9e' : '#568c7a'}/></linearGradient>
      <linearGradient id={`${uid}-hill-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#1d5961' : '#3c9470'}/><stop offset="1" stopColor={index >= 7 ? '#123b4b' : '#17654e'}/></linearGradient>
      <linearGradient id={`${uid}-soil`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7e5b42"/><stop offset="1" stopColor="#372a2c"/></linearGradient>
      <linearGradient id={`${uid}-trunk`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#513526"/><stop offset=".46" stopColor="#94633e"/><stop offset=".72" stopColor="#bd8050"/><stop offset="1" stopColor="#3d281f"/></linearGradient>
      <linearGradient id={`${uid}-trunk-light`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f1c785" stopOpacity=".55"/><stop offset=".55" stopColor="#d99258" stopOpacity=".1"/><stop offset="1" stopColor="#291817" stopOpacity=".38"/></linearGradient>
      <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#b7e47c' : '#65d28c'}/><stop offset=".5" stopColor={index >= 7 ? '#4fbe78' : '#259e68'}/><stop offset="1" stopColor="#075f4a"/></linearGradient>
      <radialGradient id={`${uid}-sun`}><stop stopColor="#fff8c8"/><stop offset=".28" stopColor="#f7c95e" stopOpacity=".8"/><stop offset="1" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
      <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="210%"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#071d25" floodOpacity=".3"/></filter>
      <filter id={`${uid}-tree-glow`} x="-60%" y="-60%" width="220%" height="240%"><feGaussianBlur stdDeviation="9"/></filter>
      <clipPath id={`${uid}-scene-clip`}><rect width="440" height="360" rx="30"/></clipPath>
    </defs>
    <g clipPath={`url(#${uid}-scene-clip)`}>
      <rect width="440" height="360" rx="30" fill={`url(#${uid}-sky)`}/>
      <circle cx="352" cy="72" r="55" fill={`url(#${uid}-sun)`} opacity={0.5 + index * 0.03}/>
      <g className="scene-clouds" fill="#fff" opacity={index >= 7 ? .16 : .45}><path d="M25 111c7-15 27-17 37-4 8-11 27-7 30 7 11 0 19 7 20 17H18c0-9 2-15 7-20Z"/><path d="M320 139c6-12 22-14 30-3 7-9 23-5 25 7 9 0 16 6 17 14h-78c0-7 2-13 6-18Z"/></g>
      {index >= 5 && <path d="M-10 245L72 139l74 96 79-75 74 72 68-111 94 120v64H-10Z" fill="#6e7697" opacity=".36"/>}
      <path d="M-18 246C52 196 105 191 170 225C230 257 276 188 342 205C391 218 420 199 466 176V336H-18Z" fill={`url(#${uid}-hill-back)`} opacity=".82"/>
      <path d="M-10 284C58 239 124 247 181 272C250 302 310 231 381 245C416 252 443 240 466 225V344H-10Z" fill={`url(#${uid}-hill-front)`}/>
      <path d="M-10 302C94 278 145 315 240 295C327 276 368 310 460 285V360H-10Z" fill="#164d45" opacity=".62"/>
      <path d="M0 311C99 295 161 324 232 310C302 296 359 318 440 303V360H0Z" fill={`url(#${uid}-soil)`} opacity=".88"/>
      <ellipse cx="228" cy="303" rx={index < 2 ? 38 : 107} ry="18" fill="#081d26" opacity=".26" filter={`url(#${uid}-tree-glow)`}/>
      <RootSystem index={index} uid={uid}/>
      <g className={pulse ? 'tree-response-pulse' : ''}><GrowthSubject index={index} uid={uid}/></g>
      <GroundLife index={index}/>
      {motes.map((mote, item) => <circle key={item} className="scene-mote" cx={mote.x} cy={mote.y} r={item % 4 === 0 ? 2.2 : 1.3} fill={item % 3 === 0 ? '#fce69b' : '#d6f8df'} style={{ animationDelay: `${mote.delay}s`, opacity: 0.18 + mescidimIntensity * 0.58 }}/>) }
      {index >= 8 && <g className="cosmic-orbit" fill="none" stroke="#eee1a5" opacity=".55"><ellipse cx="228" cy="176" rx="152" ry="75" transform="rotate(-13 228 176)" strokeDasharray="7 11"/><ellipse cx="228" cy="176" rx="126" ry="143" transform="rotate(56 228 176)" opacity=".4"/></g>}
    </g>
    <g className="tree-output-stream" aria-hidden="true">
      <path d="M230 148 C 238 111, 264 92, 280 54" fill="none" stroke="#f7dea0" strokeWidth="2" strokeDasharray="4 7" opacity=".55"/>
      {[0, 1, 2].map((item) => <circle key={item} r="2.5" fill="#fff2b5"><animateMotion dur={`${3.4 + item * .45}s`} begin={`${item * -.9}s`} repeatCount="indefinite" path="M230 148 C 238 111, 264 92, 280 54"/></circle>)}
    </g>
    <g className="growth-ring" transform="translate(228 276)" opacity={0.28 + progress / 250}><circle r="28"/><circle r="39"/><circle r="50"/></g>
  </svg>
}

function RootSystem({ index, uid }: { index: number; uid: string }) {
  const width = index < 2 ? 2.8 : 4 + index * 0.25
  return <g className="root-system" fill="none" stroke={`url(#${uid}-trunk)`} strokeWidth={width} strokeLinecap="round" opacity={0.6 + index * 0.03}>
    <path d="M228 294C207 308 184 323 154 343"/><path d="M229 295C250 309 279 325 310 344"/><path d="M226 297C216 318 212 337 212 355"/><path d="M233 298C244 318 248 339 248 357"/>
    {index >= 3 && <><path d="M191 319c-18 2-31 8-43 18"/><path d="M274 322c20 2 34 9 48 19"/></>}
  </g>
}

function GrowthSubject({ index, uid }: { index: number; uid: string }) {
  if (index === 0) return <g className="seed-stage" filter={`url(#${uid}-shadow)`}><path d="M176 298c19-19 75-24 108 0-27 20-82 20-108 0Z" fill="#704a35"/><ellipse cx="228" cy="284" rx="12" ry="8" fill="#c18a55" transform="rotate(-20 228 284)"/><path d="M228 280c-1-14 4-24 12-31" stroke="#2b9b63" strokeWidth="4" strokeLinecap="round"/><path d="M239 249c8-5 15-3 18 4-8 5-15 4-18-4Z" fill="#6ee7a2"/></g>
  if (index === 1) return <g className="sprout-stage" filter={`url(#${uid}-shadow)`}><path d="M190 300c20-16 66-17 86 0-20 13-67 14-86 0Z" fill="#704a35"/><path d="M229 293c-2-29 0-55 4-75" stroke="#258b58" strokeWidth="8" strokeLinecap="round"/><path d="M231 252c-23-18-43-12-46 5 19 12 35 10 46-5Z" fill="#55d98a"/><path d="M232 235c16-19 35-16 41-2-13 15-29 16-41 2Z" fill="#35bb70"/></g>
  if (index === 2) return <g className="fidan-stage" filter={`url(#${uid}-shadow)`}>
    <path d="M228 305C218 278 223 249 220 222C217 194 222 159 230 121C242 160 244 192 239 222C234 252 243 280 237 305Z" fill={`url(#${uid}-trunk)`}/>
    <path d="M230 290c0-32 4-59 1-86-2-22 1-43 3-62" fill="none" stroke={`url(#${uid}-trunk-light)`} strokeWidth="6" strokeLinecap="round" opacity=".72"/>
    <g className="fidan-branches" fill="none" stroke={`url(#${uid}-trunk)`} strokeLinecap="round">
      <path d="M226 238c-20-22-37-35-58-43M237 222c18-22 35-38 57-48M225 202c-13-19-24-31-39-40M238 190c15-21 28-35 44-47"/>
    </g>
    <g className="fidan-leaves">
      <path d="M116 183c-4-24 18-41 41-34 8-25 37-31 54-12 16-13 43-4 45 18 17 12 12 39-7 47-32 18-99 13-133-19Z" fill={`url(#${uid}-leaf)`}/>
      <path d="M224 146c3-25 29-39 51-27 13-21 46-18 55 7 24-2 37 25 22 44-25 20-92 24-122 5-10-7-12-18-6-29Z" fill="#32a96d"/>
      <path d="M151 221c-5-19 12-34 31-29 10-18 36-18 47 0 18-3 31 15 24 31-22 17-77 18-102-2Z" fill="#56c982"/>
      <path d="M249 213c-2-19 17-32 34-24 12-16 37-11 42 9 17 3 23 24 11 36-28 13-67 6-87-21Z" fill="#16865a"/>
      <path d="M137 175c22-8 46-8 67 1M253 150c21-5 43-3 61 7M174 207c16-4 33-2 46 5" fill="none" stroke="#c7f2ae" strokeWidth="6" strokeLinecap="round" opacity=".22"/>
    </g>
  </g>
  const treeScale = 0.84 + (index - 3) * .035
  return <g className={`tree-stage tree-tier-${index + 1}`} transform={`translate(${228 - 228 * treeScale} ${302 - 302 * treeScale}) scale(${treeScale})`} filter={`url(#${uid}-shadow)`}>
    <path d="M226 302C217 268 222 235 216 206C211 178 222 147 228 120C240 155 245 181 239 208C232 241 242 274 238 302Z" fill={`url(#${uid}-trunk)`}/>
    <path d="M230 295c-3-33 3-59-1-86-3-24 1-47 3-70" fill="none" stroke={`url(#${uid}-trunk-light)`} strokeWidth="6" strokeLinecap="round" opacity=".75"/>
    <g className="bark-texture" fill="none" stroke="#3b241d" strokeLinecap="round" opacity=".42"><path d="M222 274q8 5 17 0"/><path d="M221 247q9 5 19-1"/><path d="M221 221q8 4 18-1"/></g>
    <path d="M226 236C204 211 183 191 157 177M235 224c25-25 46-48 75-62M222 200c-9-27-20-46-38-61M237 188c22-27 36-48 43-69" fill="none" stroke={`url(#${uid}-trunk)`} strokeWidth={index >= 5 ? 13 : 10} strokeLinecap="round"/>
    {index >= 3 && <path d="M218 168c-30-19-52-45-61-72M239 157c31-18 55-39 71-66" fill="none" stroke={`url(#${uid}-trunk)`} strokeWidth="8" strokeLinecap="round"/>}
    <g className="tree-crown">
      <path d="M111 176c-9-29 18-54 48-45 4-31 39-48 63-27 19-31 64-26 73 9 36-7 60 31 38 56 27 25 2 65-30 59-13 30-50 35-72 12-22 24-62 17-70-15-31 10-61-18-50-49Z" fill={`url(#${uid}-leaf)`}/>
      <path d="M122 182c17-9 35-11 52-6M178 128c14 7 27 18 36 33M253 116c-10 14-17 30-18 49M285 169c-15 5-29 15-40 27" fill="none" stroke="#cef3b2" strokeWidth="7" opacity=".25" strokeLinecap="round"/>
      {index >= 4 && <><path d="M94 155c-10-23 11-44 34-38 2-24 31-35 48-18 6 23-3 41-24 51-18 9-38 10-58 5Z" fill="#45bd75"/><path d="M304 133c7-22 34-29 50-10 23-4 37 21 24 39-18 8-41 6-60-5-9-6-14-14-14-24Z" fill="#158556"/></>}
      {index >= 6 && <path d="M160 99c1-28 34-42 54-22 14-29 55-27 65 3 24-5 42 19 30 40-45 24-105 17-149-21Z" fill="#73cf76"/>}
      {index >= 7 && <g fill="#ffdf70" className="fruit-lights"><circle cx="145" cy="164" r="5"/><circle cx="201" cy="113" r="4"/><circle cx="281" cy="146" r="5"/><circle cx="319" cy="180" r="4"/></g>}
    </g>
  </g>
}

function GroundLife({ index }: { index: number }) {
  if (index < 3) return null
  return <g className="ground-life"><g fill="#135d49"><path d="M73 304c-4-25 7-41 16-48 4 20-1 37-16 48Z"/><path d="M91 306c0-23 13-37 25-42-1 20-9 34-25 42Z"/><path d="M345 305c-2-25 10-41 21-47 2 20-5 37-21 47Z"/></g>{index >= 4 && <g className="wildflowers">{[50,77,106,326,354,389].map((x, item) => <g key={x}><path d={`M${x} 318v-15`} stroke="#0f553e" strokeWidth="2"/><path d={`M${x - 5} 305q5-7 10 0q-5 7-10 0Z`} fill={item % 2 ? '#f9a8d4' : '#fde68a'}/></g>)}</g>}{index >= 5 && <g className="forest-companions" fill="#174d3e"><path d="M125 305l18-51 19 51Z"/><rect x="140" y="296" width="6" height="18" rx="3"/><path d="M294 305l17-47 18 47Z"/><rect x="308" y="297" width="6" height="17" rx="3"/></g>}</g>
}

const levelCopy = [
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
